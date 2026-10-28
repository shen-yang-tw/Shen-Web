import json
import logging
import math
import os
import time
from datetime import UTC, datetime
from typing import Literal

from anthropic import APIError as AnthropicAPIError
from anthropic import AsyncAnthropic
from fastapi import APIRouter
from openai import APIError as OpenAIAPIError
from openai import AsyncOpenAI
from pydantic import AliasChoices, BaseModel, ConfigDict, Field, ValidationError, model_validator

from churn_model import (
    HIGH_RISK_THRESHOLD,
    MEDIUM_RISK_THRESHOLD,
    build_features,
    get_model,
    known_probability,
    predict_probabilities,
)
from opslog import record_call

LEGACY_MODEL_ALIASES = {"claude-3-5-sonnet": "claude-sonnet-5-5"}
configured_model = os.getenv("ACTIVE_MODEL", "claude-sonnet-5-5").strip()
ACTIVE_MODEL = LEGACY_MODEL_ALIASES.get(configured_model, configured_model)
MODEL_PRICING_USD_PER_MILLION_TOKENS = {
    "claude-sonnet-5-5": (2.0, 10.0),
    "claude-sonnet-5": (2.0, 10.0),
    "claude-sonnet-4-6": (3.0, 15.0),
    "gpt-4o": (2.5, 10.0),
}

if ACTIVE_MODEL not in MODEL_PRICING_USD_PER_MILLION_TOKENS:
    raise RuntimeError(
        "ACTIVE_MODEL must be 'claude-sonnet-5-5', 'claude-sonnet-5', "
        "'claude-sonnet-4-6', or 'gpt-4o'."
    )

router = APIRouter()
logger = logging.getLogger(__name__)


class CustomerInput(BaseModel):
    model_config = ConfigDict(extra="allow", allow_inf_nan=False)

    customer_id: str = Field(
        default="unknown",
        validation_alias=AliasChoices("customer_id", "customerID", "id"),
    )
    usage_frequency: float | None = Field(default=None, ge=0)
    actual_churn: bool | None = None  # 資料集中已知是否已流失（Telco 的 Churn 欄位）
    login_count: int | None = Field(
        default=None,
        ge=0,
        validation_alias=AliasChoices("login_count", "loginCount", "logins"),
    )
    plan: str = Field(
        default="unknown",
        validation_alias=AliasChoices("plan", "Contract", "contract"),
    )
    tenure_months: int | None = Field(
        default=None,
        ge=0,
        validation_alias=AliasChoices("tenure_months", "tenure"),
    )
    monthly_charges: float = Field(
        default=0,
        ge=0,
        validation_alias=AliasChoices("monthly_charges", "MonthlyCharges"),
    )
    internet_service: str | None = Field(
        default=None,
        validation_alias=AliasChoices("internet_service", "InternetService"),
    )
    payment_method: str | None = Field(
        default=None,
        validation_alias=AliasChoices("payment_method", "PaymentMethod"),
    )
    paperless_billing: str | None = Field(
        default=None,
        validation_alias=AliasChoices("paperless_billing", "PaperlessBilling"),
    )
    senior_citizen: str | None = Field(
        default=None,
        validation_alias=AliasChoices("senior_citizen", "SeniorCitizen"),
    )


class MRRHistoryPoint(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    month: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
    mrr: float = Field(ge=0)


class ModelOpsEvent(BaseModel):
    model_config = ConfigDict(extra="allow", allow_inf_nan=False)

    input_tokens: int = Field(default=0, ge=0)
    output_tokens: int = Field(default=0, ge=0)
    latency_ms: float = Field(default=0, ge=0)
    success: bool = True

    @model_validator(mode="before")
    @classmethod
    def normalize_status(cls, value: object) -> object:
        if not isinstance(value, dict):
            return value
        normalized = dict(value)
        if "success" not in normalized and "succeeded" in normalized:
            normalized["success"] = normalized["succeeded"]
        if "success" not in normalized and "status" in normalized:
            normalized["success"] = str(normalized["status"]).strip().lower() in {
                "ok",
                "success",
                "succeeded",
                "completed",
            }
        return normalized


class PredictionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    customers: list[CustomerInput] = Field(
        default_factory=list,
        validation_alias=AliasChoices("customers", "records"),
    )
    mrr_history: list[MRRHistoryPoint] = Field(default_factory=list)
    modelops_events: list[ModelOpsEvent] = Field(
        default_factory=list,
        validation_alias=AliasChoices("modelops_events", "modelops"),
    )


class ChurnRisk(BaseModel):
    customer_id: str
    churn_probability: float = Field(ge=0, le=1)
    risk_level: Literal["High"]


class ChurnPrediction(BaseModel):
    customer_id: str
    churn_probability: float = Field(ge=0, le=1)
    risk_level: Literal["High", "Medium", "Low"]


class MRRForecastPoint(BaseModel):
    month: str
    mrr: float = Field(ge=0)


class MRRForecast(BaseModel):
    source: Literal["history", "current_customer_baseline", "snapshot_scenario"]
    forecast: list[MRRForecastPoint] = Field(min_length=6, max_length=6)
    current_month: str | None = None  # 目前（快照）所在月份
    current_mrr: float | None = Field(default=None, ge=0)  # 目前仍在網客戶的月費總和
    monthly_churn_rate: float | None = Field(default=None, ge=0, lt=1)  # 資料推得的每月營收流失率
    at_risk_mrr: float | None = Field(default=None, ge=0)  # 高風險客戶佔的月費總和


class ModelOpsMetrics(BaseModel):
    model: str
    request_count: int = Field(ge=0)
    input_tokens: int = Field(ge=0)
    output_tokens: int = Field(ge=0)
    input_cost_usd: float = Field(ge=0)
    output_cost_usd: float = Field(ge=0)
    total_cost_usd: float = Field(ge=0)
    average_latency_ms: float | None = Field(default=None, ge=0)
    p95_latency_ms: float | None = Field(default=None, ge=0)
    failure_rate: float | None = Field(default=None, ge=0, le=1)


class AISummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    summary_en: str = Field(min_length=1, max_length=1000)
    summary_zh: str = Field(min_length=1, max_length=1000)


class PredictionResponse(BaseModel):
    active_model: str
    churn_analyzed: int = Field(ge=0)
    churn_method: Literal["logistic_regression", "heuristic_not_calibrated"]
    churn_predictions: list[ChurnPrediction]
    high_risk_customers: list[ChurnRisk]
    mrr: MRRForecast
    modelops: ModelOpsMetrics
    ai_status: Literal["generated", "not_configured", "provider_error"]
    ai_error: str | None
    ai_summary: AISummary | None


def _score_churn(customer: CustomerInput) -> float:
    probability = 0.12

    if customer.login_count is not None:
        if customer.login_count <= 1:
            probability += 0.15
        elif customer.login_count <= 3:
            probability += 0.08

    if customer.usage_frequency is not None:
        if customer.usage_frequency <= 1:
            probability += 0.15
        elif customer.usage_frequency <= 3:
            probability += 0.08

    plan = customer.plan.strip().lower()
    if plan in {"month-to-month", "monthly", "month to month"}:
        probability += 0.34
    elif plan in {"one year", "annual", "yearly"}:
        probability += 0.12
    else:
        probability += 0.04

    if customer.tenure_months is not None:
        if customer.tenure_months <= 12:
            probability += 0.22
        elif customer.tenure_months <= 24:
            probability += 0.08

    if customer.monthly_charges > 75:
        probability += 0.12
    if (customer.internet_service or "").strip().lower() == "fiber optic":
        probability += 0.08
    if (customer.payment_method or "").strip().lower() == "electronic check":
        probability += 0.10
    if (customer.paperless_billing or "").strip().lower() == "yes":
        probability += 0.05
    if (customer.senior_citizen or "").strip() == "1":
        probability += 0.09

    return round(min(max(probability, 0.0), 1.0), 4)


def _model_features(customer: CustomerInput) -> dict | None:
    # 欄位齊全才能交給模型；缺欄位（例如只有部分資料的呼叫）就退回規則評分
    if (
        customer.tenure_months is None
        or customer.internet_service is None
        or customer.payment_method is None
        or customer.paperless_billing is None
        or customer.senior_citizen is None
        or customer.plan == "unknown"
    ):
        return None
    return build_features(
        contract=customer.plan,
        tenure=customer.tenure_months,
        monthly_charges=customer.monthly_charges,
        internet_service=customer.internet_service,
        payment_method=customer.payment_method,
        paperless_billing=customer.paperless_billing,
        senior_citizen=customer.senior_citizen,
    )


def score_customers(customers: list[CustomerInput]) -> list[ChurnPrediction]:
    probabilities: dict[int, float] = {}
    pending: list[tuple[int, dict]] = []
    for index, customer in enumerate(customers):
        # 資料集內的客戶用「交叉驗證外」機率；新客戶稍後批次交給模型預測
        known = known_probability(customer.customer_id)
        if known is not None:
            probabilities[index] = known
            continue
        features = _model_features(customer)
        if features is not None:
            pending.append((index, features))
    if pending:
        predicted = predict_probabilities([features for _, features in pending])
        if predicted is not None:
            for (index, _), probability in zip(pending, predicted, strict=True):
                probabilities[index] = probability

    predictions: list[ChurnPrediction] = []
    for index, customer in enumerate(customers):
        probability = probabilities.get(index)
        if probability is None:
            probability = _score_churn(customer)  # 模型不可用時的後備規則
        risk_level: Literal["High", "Medium", "Low"] = (
            "High"
            if probability >= HIGH_RISK_THRESHOLD
            else "Medium"
            if probability >= MEDIUM_RISK_THRESHOLD
            else "Low"
        )
        predictions.append(
            ChurnPrediction(
                customer_id=customer.customer_id,
                churn_probability=probability,
                risk_level=risk_level,
            )
        )
    return predictions


def predict_user_churn(customers: list[CustomerInput]) -> list[ChurnRisk]:
    return [
        ChurnRisk(
            customer_id=prediction.customer_id,
            churn_probability=prediction.churn_probability,
            risk_level="High",
        )
        for prediction in score_customers(customers)
        if prediction.churn_probability >= HIGH_RISK_THRESHOLD
    ]


def _next_month(month: str, offset: int) -> str:
    year_text, month_text = month.split("-", maxsplit=1)
    month_index = int(year_text) * 12 + int(month_text) - 1 + offset
    year, zero_based_month = divmod(month_index, 12)
    return f"{year:04d}-{zero_based_month + 1:02d}"


def forecast_mrr(
    history: list[MRRHistoryPoint],
    customers: list[CustomerInput],
) -> MRRForecast:
    current_mrr: float | None = None
    monthly_churn_rate: float | None = None
    current_month = datetime.now(UTC).strftime("%Y-%m")
    if history:
        ordered_history = sorted(history, key=lambda point: point.month)
        values = [point.mrr for point in ordered_history]
        last_month = ordered_history[-1].month
        source: Literal[
            "history", "current_customer_baseline", "snapshot_scenario"
        ] = "history"
    else:
        # 沒有歷史時，以「目前仍在網客戶」為起點，再依資料推得的每月營收流失率往後推
        active = [customer for customer in customers if customer.actual_churn is not True]
        current_mrr = sum(customer.monthly_charges for customer in active)
        values = [current_mrr]
        last_month = current_month
        known = [customer for customer in customers if customer.actual_churn is not None]
        # 流失率 = 已流失客戶的月費總和 ÷ 全體客戶累計的「月費×在網月數」
        exposure = sum(
            customer.monthly_charges * (customer.tenure_months or 0) for customer in known
        )
        lost = sum(customer.monthly_charges for customer in known if customer.actual_churn)
        monthly_churn_rate = round(min(lost / exposure, 0.5), 4) if exposure > 0 else 0.0
        source = "snapshot_scenario" if monthly_churn_rate > 0 else "current_customer_baseline"

    average = sum(values) / len(values)
    if len(values) > 1:
        x_average = (len(values) - 1) / 2
        y_average = average
        denominator = sum((index - x_average) ** 2 for index in range(len(values)))
        slope = (
            sum(
                (index - x_average) * (value - y_average)
                for index, value in enumerate(values)
            )
            / denominator
        )
    else:
        slope = 0.0

    if source == "snapshot_scenario" and monthly_churn_rate is not None:
        forecast = [
            MRRForecastPoint(
                month=_next_month(last_month, step),
                mrr=round(values[0] * (1 - monthly_churn_rate) ** step, 2),
            )
            for step in range(1, 7)
        ]
    else:
        forecast = [
            MRRForecastPoint(
                month=_next_month(last_month, step),
                mrr=round(max(0.0, values[-1] + slope * step), 2),
            )
            for step in range(1, 7)
        ]
    return MRRForecast(
        source=source,
        forecast=forecast,
        current_month=last_month,
        current_mrr=round(current_mrr, 2) if current_mrr is not None else None,
        monthly_churn_rate=monthly_churn_rate,
    )


def analyze_modelops(events: list[ModelOpsEvent]) -> ModelOpsMetrics:
    input_rate, output_rate = MODEL_PRICING_USD_PER_MILLION_TOKENS[ACTIVE_MODEL]
    input_tokens = sum(event.input_tokens for event in events)
    output_tokens = sum(event.output_tokens for event in events)
    input_cost = input_tokens * input_rate / 1_000_000
    output_cost = output_tokens * output_rate / 1_000_000
    latencies = sorted(event.latency_ms for event in events)
    p95_latency = (
        latencies[max(0, math.ceil(len(latencies) * 0.95) - 1)]
        if latencies
        else None
    )

    return ModelOpsMetrics(
        model=ACTIVE_MODEL,
        request_count=len(events),
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        input_cost_usd=round(input_cost, 8),
        output_cost_usd=round(output_cost, 8),
        total_cost_usd=round(input_cost + output_cost, 8),
        average_latency_ms=(
            round(sum(latencies) / len(latencies), 2) if latencies else None
        ),
        p95_latency_ms=p95_latency,
        failure_rate=(
            round(sum(not event.success for event in events) / len(events), 4)
            if events
            else None
        ),
    )


async def _generate_ai_summary(
    churn_count: int,
    mrr: MRRForecast,
) -> tuple[AISummary | None, ModelOpsEvent | None, str | None]:
    summary_data = {
        "high_risk_customer_count": churn_count,
        "mrr_source": mrr.source,
        "mrr_forecast": [point.model_dump() for point in mrr.forecast],
    }
    instruction = (
        "Write one concise sentence in English and one in Traditional Chinese. "
        "Both sentences must express the same facts and must not infer information "
        "absent from the input. Return only the exact JSON "
        'object {"summary_en":"...","summary_zh":"..."} with no Markdown.'
    )
    user_content = json.dumps(summary_data, ensure_ascii=False)

    if ACTIVE_MODEL != "gpt-4o":
        api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
        if not api_key:
            return None, None, None
        client = AsyncAnthropic(api_key=api_key)
        started_at = time.perf_counter()
        try:
            response = await client.messages.create(
                model=ACTIVE_MODEL,
                max_tokens=300,
                system=instruction,
                messages=[{"role": "user", "content": user_content}],
                output_config={
                    "format": {
                        "type": "json_schema",
                        "schema": AISummary.model_json_schema(),
                    }
                },
            )
            summary_text = "".join(
                block.text for block in response.content if block.type == "text"
            )
            if not summary_text:
                ai_error = "Anthropic did not return the requested bilingual summary."
                logger.warning("%s", ai_error)
                return None, _failed_model_call(started_at), ai_error
            summary = AISummary.model_validate_json(summary_text)
            call_event = ModelOpsEvent(
                input_tokens=response.usage.input_tokens,
                output_tokens=response.usage.output_tokens,
                latency_ms=(time.perf_counter() - started_at) * 1000,
                success=True,
            )
            return summary, call_event, None
        except AnthropicAPIError as error:
            ai_error = _provider_error("Anthropic", error)
            logger.warning("%s", ai_error)
            return None, _failed_model_call(started_at), ai_error
        except ValidationError:
            ai_error = "Anthropic returned a summary that did not match the required bilingual schema."
            logger.warning("%s", ai_error)
            return None, _failed_model_call(started_at), ai_error
        finally:
            await client.close()
    else:
        api_key = os.getenv("OPENAI_API_KEY", "").strip()
        if not api_key:
            return None, None, None
        client = AsyncOpenAI(api_key=api_key)
        started_at = time.perf_counter()
        try:
            response = await client.chat.completions.create(
                model=ACTIVE_MODEL,
                max_tokens=300,
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "bilingual_summary",
                        "strict": True,
                        "schema": AISummary.model_json_schema(),
                    },
                },
                messages=[
                    {
                        "role": "system",
                        "content": instruction,
                    },
                    {
                        "role": "user",
                        "content": user_content,
                    },
                ],
            )
            raw_summary = response.choices[0].message.content or ""
            if response.usage is None:
                ai_error = "OpenAI response did not include token usage."
                logger.warning("%s", ai_error)
                return None, _failed_model_call(started_at), ai_error
            summary = AISummary.model_validate_json(raw_summary)
            call_event = ModelOpsEvent(
                input_tokens=response.usage.prompt_tokens,
                output_tokens=response.usage.completion_tokens,
                latency_ms=(time.perf_counter() - started_at) * 1000,
                success=True,
            )
            return summary, call_event, None
        except OpenAIAPIError as error:
            ai_error = _provider_error("OpenAI", error)
            logger.warning("%s", ai_error)
            return None, _failed_model_call(started_at), ai_error
        except ValidationError:
            ai_error = "OpenAI returned a summary that did not match the required bilingual schema."
            logger.warning("%s", ai_error)
            return None, _failed_model_call(started_at), ai_error
        finally:
            await client.close()

def _failed_model_call(started_at: float) -> ModelOpsEvent:
    return ModelOpsEvent(
        latency_ms=(time.perf_counter() - started_at) * 1000,
        success=False,
    )


def _provider_error(provider: str, error: AnthropicAPIError | OpenAIAPIError) -> str:
    status_code = getattr(error, "status_code", None) or "connection error"
    detail = " ".join(error.message.split())[:300]
    return f"{provider} request failed ({status_code}): {detail}"


@router.post("/api/v1/ai/predict", response_model=PredictionResponse)
async def predict(payload: PredictionRequest) -> PredictionResponse:
    churn_predictions = score_customers(payload.customers)
    high_risk_customers = [
        ChurnRisk(
            customer_id=prediction.customer_id,
            churn_probability=prediction.churn_probability,
            risk_level="High",
        )
        for prediction in churn_predictions
        if prediction.churn_probability >= HIGH_RISK_THRESHOLD
    ]
    mrr = forecast_mrr(payload.mrr_history, payload.customers)
    high_risk_ids = {risk.customer_id for risk in high_risk_customers}
    mrr.at_risk_mrr = round(
        sum(
            customer.monthly_charges
            for customer in payload.customers
            if customer.customer_id in high_risk_ids and customer.actual_churn is not True
        ),
        2,
    )
    submitted_modelops = analyze_modelops(payload.modelops_events)
    ai_summary, model_call, ai_error = await _generate_ai_summary(
        len(high_risk_customers),
        mrr,
    )
    modelops = analyze_modelops(
        [*payload.modelops_events, *([model_call] if model_call is not None else [])]
    )
    if model_call is not None:
        # 寫入真實呼叫紀錄；紀錄失敗不應影響預測回應
        try:
            record_call(
                ACTIVE_MODEL,
                model_call.input_tokens,
                model_call.output_tokens,
                model_call.latency_ms,
                model_call.success,
            )
        except Exception:
            logger.exception("Failed to record model call")

    return PredictionResponse(
        active_model=ACTIVE_MODEL,
        churn_analyzed=len(payload.customers),
        churn_method=(
            "logistic_regression" if get_model() is not None else "heuristic_not_calibrated"
        ),
        churn_predictions=churn_predictions,
        high_risk_customers=high_risk_customers,
        mrr=mrr,
        modelops=modelops,
        ai_status=(
            "generated"
            if ai_summary is not None
            else "provider_error"
            if ai_error is not None
            else "not_configured"
        ),
        ai_error=ai_error,
        ai_summary=ai_summary,
    )
