import asyncio
import os
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

# 測試使用暫存資料庫，避免污染真實的呼叫紀錄
os.environ["MODELOPS_DB_PATH"] = str(Path(tempfile.mkdtemp()) / "test_modelops.db")

from anthropic import APIConnectionError as AnthropicAPIConnectionError
from fastapi.testclient import TestClient
from httpx import Request
from openai import APIConnectionError as OpenAIAPIConnectionError

from ai import (
    ACTIVE_MODEL,
    MODEL_PRICING_USD_PER_MILLION_TOKENS,
    CustomerInput,
    MRRHistoryPoint,
    ModelOpsEvent,
    PredictionRequest,
    _generate_ai_summary,
    analyze_modelops,
    forecast_mrr,
    predict,
    predict_user_churn,
    score_customers,
)
from main import app


class PredictionTests(unittest.TestCase):
    def test_kaggle_fields_and_low_usage_identify_high_churn_risk(self) -> None:
        customer = CustomerInput.model_validate(
            {
                "customerID": "C-100",
                "Contract": "Month-to-month",
                "tenure": 2,
                "MonthlyCharges": 90,
                "InternetService": "Fiber optic",
                "PaymentMethod": "Electronic check",
                "PaperlessBilling": "Yes",
                "SeniorCitizen": "1",
                "usage_frequency": 0,
                "logins": 0,
            }
        )

        risks = predict_user_churn([customer])
        probability = score_customers([customer])[0].churn_probability

        # 資料裡最極端的高風險組合，模型給出約 79%，已達 70% 的高風險門檻
        self.assertGreaterEqual(probability, 0.7)
        self.assertEqual(len(risks), 1)
        self.assertEqual(risks[0].customer_id, "C-100")

    def test_mrr_forecast_returns_six_monthly_points(self) -> None:
        history = [
            MRRHistoryPoint(month="2026-01", mrr=100),
            MRRHistoryPoint(month="2026-02", mrr=110),
            MRRHistoryPoint(month="2026-03", mrr=120),
        ]

        result = forecast_mrr(history, [])

        self.assertEqual(len(result.forecast), 6)
        self.assertEqual(result.forecast[0].month, "2026-04")
        self.assertEqual(result.forecast[-1].month, "2026-09")
        self.assertEqual(result.forecast[-1].mrr, 180)

    def test_modelops_cost_latency_and_failure_rate(self) -> None:
        events = [
            ModelOpsEvent(
                input_tokens=1_000_000,
                output_tokens=1_000_000,
                latency_ms=100,
                success=True,
            ),
            ModelOpsEvent(
                input_tokens=1_000_000,
                output_tokens=0,
                latency_ms=300,
                success=False,
            ),
        ]

        result = analyze_modelops(events)
        input_rate, output_rate = MODEL_PRICING_USD_PER_MILLION_TOKENS[ACTIVE_MODEL]

        self.assertEqual(result.input_cost_usd, input_rate * 2)
        self.assertEqual(result.output_cost_usd, output_rate)
        self.assertEqual(result.average_latency_ms, 200)
        self.assertEqual(result.p95_latency_ms, 300)
        self.assertEqual(result.failure_rate, 0.5)

    def test_anthropic_json_schema_summary_is_validated_and_measured(self) -> None:
        response = SimpleNamespace(
            content=[
                SimpleNamespace(
                    type="text",
                    text=(
                        '{"summary_en":"Prioritize retention outreach for high-risk customers.",'
                        '"summary_zh":"請優先聯絡高風險客戶，採取客戶挽留措施。"}'
                    ),
                )
            ],
            usage=SimpleNamespace(input_tokens=20, output_tokens=12),
        )
        with (
            patch("ai.ACTIVE_MODEL", "claude-sonnet-5-5"),
            patch.dict(os.environ, {"ANTHROPIC_API_KEY": "test-key"}),
            patch("ai.AsyncAnthropic") as anthropic_client,
        ):
            client = anthropic_client.return_value
            client.messages.create = AsyncMock(return_value=response)
            client.close = AsyncMock()
            summary, event, error = asyncio.run(
                _generate_ai_summary(
                    1,
                    forecast_mrr([], []),
                )
            )

        self.assertIsNotNone(summary)
        self.assertEqual(summary.summary_en, "Prioritize retention outreach for high-risk customers.")
        self.assertEqual(summary.summary_zh, "請優先聯絡高風險客戶，採取客戶挽留措施。")
        self.assertIsNotNone(event)
        self.assertEqual(event.input_tokens, 20)
        self.assertEqual(event.output_tokens, 12)
        self.assertIsNone(error)
        call_arguments = anthropic_client.return_value.messages.create.await_args.kwargs
        self.assertEqual(
            call_arguments["output_config"]["format"]["type"],
            "json_schema",
        )

    def test_openai_json_schema_returns_bilingual_summary(self) -> None:
        response = SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(
                        content=(
                            '{"summary_en":"High-risk accounts need attention.",'
                            '"summary_zh":"高風險客戶需要優先關注。"}'
                        )
                    )
                )
            ],
            usage=SimpleNamespace(prompt_tokens=20, completion_tokens=12),
        )
        with (
            patch("ai.ACTIVE_MODEL", "gpt-4o"),
            patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}),
            patch("ai.AsyncOpenAI") as openai_client,
        ):
            client = openai_client.return_value
            client.chat.completions.create = AsyncMock(return_value=response)
            client.close = AsyncMock()
            summary, event, error = asyncio.run(
                _generate_ai_summary(
                    1,
                    forecast_mrr([], []),
                )
            )

        self.assertEqual(summary.summary_en, "High-risk accounts need attention.")
        self.assertEqual(summary.summary_zh, "高風險客戶需要優先關注。")
        self.assertEqual(event.input_tokens, 20)
        self.assertEqual(event.output_tokens, 12)
        self.assertIsNone(error)
        call_arguments = client.chat.completions.create.await_args.kwargs
        self.assertEqual(call_arguments["response_format"]["type"], "json_schema")

    def test_anthropic_connection_error_preserves_prediction_response(self) -> None:
        with (
            patch.dict(os.environ, {"ANTHROPIC_API_KEY": "test-key"}),
            patch("ai.AsyncAnthropic") as anthropic_client,
        ):
            client = anthropic_client.return_value
            client.messages.create = AsyncMock(
                side_effect=AnthropicAPIConnectionError(
                    message="Connection refused",
                    request=Request("POST", "https://api.anthropic.com/v1/messages"),
                )
            )
            client.close = AsyncMock()
            response = TestClient(app).post(
                "/api/v1/ai/predict",
                json={
                    "customers": [
                        {
                            "customer_id": "C-ERROR-RECOVERY",
                            "contract": "Month-to-month",
                            "tenure": 1,
                            "monthly_charges": 100,
                        }
                    ]
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["churn_predictions"][0]["customer_id"], "C-ERROR-RECOVERY")
        self.assertEqual(payload["ai_status"], "provider_error")
        self.assertIn("Anthropic request failed", payload["ai_error"])
        self.assertEqual(payload["ai_summary"], None)
        self.assertEqual(payload["modelops"]["failure_rate"], 1.0)

    def test_openai_connection_error_preserves_prediction_response(self) -> None:
        with (
            patch("ai.ACTIVE_MODEL", "gpt-4o"),
            patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}),
            patch("ai.AsyncOpenAI") as openai_client,
        ):
            client = openai_client.return_value
            client.chat.completions.create = AsyncMock(
                side_effect=OpenAIAPIConnectionError(
                    message="Connection refused",
                    request=Request("POST", "https://api.openai.com/v1/chat/completions"),
                )
            )
            client.close = AsyncMock()
            response = TestClient(app).post(
                "/api/v1/ai/predict",
                json={
                    "customers": [
                        {
                            "customer_id": "C-OPENAI-RECOVERY",
                            "contract": "Month-to-month",
                            "tenure": 1,
                            "monthly_charges": 100,
                        }
                    ]
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["churn_predictions"][0]["customer_id"], "C-OPENAI-RECOVERY")
        self.assertEqual(payload["ai_status"], "provider_error")
        self.assertIn("OpenAI request failed", payload["ai_error"])
        self.assertEqual(payload["modelops"]["failure_rate"], 1.0)

    def test_prediction_endpoint_returns_validated_json_without_model_key(self) -> None:
        payload = PredictionRequest.model_validate(
            {
                "records": [
                    {
                        "customer_id": "C-101",
                        "contract": "Month-to-month",
                        "tenure": 1,
                        "monthly_charges": 100,
                    }
                ],
                "mrr_history": [{"month": "2026-09", "mrr": 250}],
                "modelops": [
                    {
                        "input_tokens": 10,
                        "output_tokens": 5,
                        "latency_ms": 25,
                        "status": "failed",
                    }
                ],
            }
        )
        with patch.dict(
            os.environ,
            {"ANTHROPIC_API_KEY": "", "OPENAI_API_KEY": ""},
        ):
            result = asyncio.run(predict(payload))

        response = result.model_dump(mode="json")
        self.assertEqual(response["active_model"], ACTIVE_MODEL)
        self.assertEqual(response["churn_method"], "logistic_regression")
        self.assertEqual(response["churn_predictions"][0]["customer_id"], "C-101")
        self.assertEqual(response["churn_predictions"][0]["churn_probability"], 0.8)
        self.assertEqual(response["churn_predictions"][0]["risk_level"], "High")
        self.assertEqual(len(response["mrr"]["forecast"]), 6)
        self.assertEqual(response["modelops"]["failure_rate"], 1.0)
        self.assertEqual(response["ai_status"], "not_configured")
        self.assertIsNone(response["ai_summary"])

    def test_prediction_route_is_registered_on_fastapi_app(self) -> None:
        with patch.dict(
            os.environ,
            {"ANTHROPIC_API_KEY": "", "OPENAI_API_KEY": ""},
        ):
            response = TestClient(app).post(
                "/api/v1/ai/predict",
                json={"customers": [], "mrr_history": [], "modelops_events": []},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["churn_analyzed"], 0)
        self.assertEqual(payload["churn_method"], "logistic_regression")
        self.assertEqual(payload["churn_predictions"], [])
        self.assertEqual(len(payload["mrr"]["forecast"]), 6)


class RetentionActionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)
        self.customer_id = "2424-WVHPL"

    def test_retention_action_persists_and_follows_valid_workflow(self) -> None:
        created = self.client.post(
            "/api/v1/retention/actions",
            json={"customer_id": self.customer_id},
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()["status"], "queued")

        duplicate = self.client.post(
            "/api/v1/retention/actions",
            json={"customer_id": self.customer_id},
        )
        self.assertEqual(duplicate.status_code, 201)
        self.assertEqual(duplicate.json()["created_at"], created.json()["created_at"])

        in_progress = self.client.patch(
            f"/api/v1/retention/actions/{self.customer_id}",
            json={"status": "in_progress"},
        )
        self.assertEqual(in_progress.status_code, 200)
        self.assertEqual(in_progress.json()["status"], "in_progress")

        completed = self.client.patch(
            f"/api/v1/retention/actions/{self.customer_id}",
            json={"status": "completed"},
        )
        self.assertEqual(completed.status_code, 200)
        self.assertEqual(completed.json()["status"], "completed")

        persisted = self.client.get("/api/v1/retention/actions")
        self.assertEqual(persisted.status_code, 200)
        self.assertEqual(
            next(action for action in persisted.json() if action["customer_id"] == self.customer_id)[
                "status"
            ],
            "completed",
        )

        reopened = self.client.patch(
            f"/api/v1/retention/actions/{self.customer_id}",
            json={"status": "queued"},
        )
        self.assertEqual(reopened.status_code, 200)
        self.assertEqual(reopened.json()["status"], "queued")

    def test_retention_action_rejects_invalid_customer_and_state_transition(self) -> None:
        missing = self.client.post(
            "/api/v1/retention/actions",
            json={"customer_id": "NOT-A-REAL-CUSTOMER"},
        )
        self.assertEqual(missing.status_code, 404)

        created = self.client.post(
            "/api/v1/retention/actions",
            json={"customer_id": self.customer_id},
        )
        self.assertEqual(created.status_code, 201)
        skipped = self.client.patch(
            f"/api/v1/retention/actions/{self.customer_id}",
            json={"status": "completed"},
        )
        self.assertEqual(skipped.status_code, 409)


class TelemetryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.records = [
            {"tenure": tenure, "monthly_charges": 50.0} for tenure in (1, 3, 6, 12, 24, 40)
        ]

    def test_trained_churn_model_is_honest_and_calibrated(self) -> None:
        from churn_model import get_model, known_probability

        model = get_model()
        self.assertIsNotNone(model)
        card = model.card
        self.assertGreater(card.test_roc_auc, 0.75)
        self.assertGreater(card.test_rows, 1000)
        self.assertEqual(card.train_rows + card.test_rows, len(model.out_of_fold))
        for bucket in card.calibration:
            if bucket["count"] >= 100:
                self.assertLess(abs(bucket["predicted"] - bucket["actual"]), 0.08)
        self.assertIsNotNone(known_probability("7590-VHVEG"))

    def test_model_scores_unseen_customer_with_full_features(self) -> None:
        from ai import score_customers

        risky = CustomerInput.model_validate(
            {
                "customer_id": "NEW-1",
                "tenure": 1,
                "monthly_charges": 95,
                "contract": "Month-to-month",
                "internet_service": "Fiber optic",
                "payment_method": "Electronic check",
                "paperless_billing": "Yes",
                "senior_citizen": "1",
            }
        )
        loyal = risky.model_copy(
            update={"customer_id": "NEW-2", "tenure_months": 70, "plan": "Two year"}
        )
        high, low = score_customers([risky, loyal])
        self.assertGreater(high.churn_probability, low.churn_probability + 0.3)

    def test_without_billing_file_history_is_empty(self) -> None:
        from telemetry import build_telemetry

        result = build_telemetry(self.records)
        self.assertEqual(result.mrr_history, [])
        self.assertEqual(result.mrr_source, "none")

    def test_snapshot_scenario_declines_from_current_mrr(self) -> None:
        customers = [
            CustomerInput(customer_id="a", tenure_months=10, monthly_charges=100, actual_churn=False),
            CustomerInput(customer_id="b", tenure_months=10, monthly_charges=100, actual_churn=False),
            CustomerInput(customer_id="c", tenure_months=10, monthly_charges=100, actual_churn=True),
        ]
        result = forecast_mrr([], customers)
        self.assertEqual(result.source, "snapshot_scenario")
        self.assertEqual(result.current_mrr, 200.0)
        self.assertAlmostEqual(result.monthly_churn_rate, 100 / 3000, places=4)
        values = [point.mrr for point in result.forecast]
        self.assertEqual(values, sorted(values, reverse=True))
        self.assertLess(values[-1], 200.0)

    def test_modelops_aggregates_real_logged_calls(self) -> None:
        from opslog import record_call
        from telemetry import build_telemetry

        record_call(ACTIVE_MODEL, 1000, 500, 1200.0, True)
        record_call(ACTIVE_MODEL, 2000, 300, 3000.0, False)
        result = build_telemetry(self.records)
        summary = result.modelops_summary
        self.assertEqual(result.modelops_source, "request_log")
        self.assertGreaterEqual(summary.total_requests, 2)
        self.assertGreater(summary.failure_rate, 0)
        self.assertGreater(summary.total_cost_usd, 0)
        self.assertAlmostEqual(
            summary.budget_used_ratio, summary.total_cost_usd / summary.budget_usd, places=3
        )

    def test_outliers_flag_a_spike(self) -> None:
        from telemetry import _outliers

        values = [100.0, 102.0, 98.0, 101.0, 99.0, 100.0, 103.0, 400.0]
        labels = [f"d{index}" for index in range(len(values))]
        self.assertEqual([item[0] for item in _outliers(values, labels)], ["d7"])

    def test_telemetry_endpoint(self) -> None:
        response = TestClient(app).get("/api/v1/ops/telemetry")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["modelops_source"], "request_log")


if __name__ == "__main__":
    unittest.main()
