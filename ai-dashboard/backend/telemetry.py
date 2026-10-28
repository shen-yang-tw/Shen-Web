import csv
import math
import os
import statistics
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field

from ai import ACTIVE_MODEL, MODEL_PRICING_USD_PER_MILLION_TOKENS
from opslog import read_calls

BILLING_CSV = Path(__file__).resolve().parent / "data" / "mrr_history.csv"
MONTHLY_BUDGET_USD = float(os.getenv("MONTHLY_AI_BUDGET_USD", "250"))  # 每月 AI 預算上限（可用環境變數調整）
TELEMETRY_DAYS = 30  # 觀察最近 30 天
MRR_HISTORY_MONTHS = 12  # 重建最近 12 個月營收


class MRRPoint(BaseModel):
    month: str
    mrr: float = Field(ge=0)


class DailyModelOps(BaseModel):
    date: str
    requests: int = Field(ge=0)
    input_tokens: int = Field(ge=0)
    output_tokens: int = Field(ge=0)
    cost_usd: float = Field(ge=0)
    average_latency_ms: float = Field(ge=0)
    p95_latency_ms: float = Field(ge=0)
    failure_rate: float = Field(ge=0, le=1)


class ModelOpsSummary(BaseModel):
    model: str
    period_days: int
    total_requests: int
    total_input_tokens: int
    total_output_tokens: int
    total_cost_usd: float
    budget_usd: float
    budget_used_ratio: float
    average_latency_ms: float
    p95_latency_ms: float
    failure_rate: float


class Anomaly(BaseModel):
    metric: Literal["latency", "failure_rate", "cost", "mrr"]
    period: str
    value: float
    baseline: float
    direction: Literal["high", "low"]


class TelemetryResponse(BaseModel):
    mrr_source: Literal["billing_csv", "none"]
    mrr_history: list[MRRPoint]
    modelops_source: Literal["request_log"]
    modelops_daily: list[DailyModelOps]
    modelops_summary: ModelOpsSummary
    anomalies: list[Anomaly]



def build_modelops_daily(today: date) -> list[DailyModelOps]:
    # 從資料庫讀取真實的大模型呼叫紀錄，依日期（UTC）彙總
    since = datetime.combine(
        today - timedelta(days=TELEMETRY_DAYS - 1), datetime.min.time(), tzinfo=UTC
    )
    by_day: dict[str, list[dict]] = {}
    for call in read_calls(since.isoformat()):
        by_day.setdefault(call["created_at"][:10], []).append(call)

    days: list[DailyModelOps] = []
    for day, calls in sorted(by_day.items()):
        latencies = sorted(call["latency_ms"] for call in calls)
        cost = sum(
            call["input_tokens"] * _rates(call["model"])[0] / 1_000_000
            + call["output_tokens"] * _rates(call["model"])[1] / 1_000_000
            for call in calls
        )
        days.append(
            DailyModelOps(
                date=day,
                requests=len(calls),
                input_tokens=sum(call["input_tokens"] for call in calls),
                output_tokens=sum(call["output_tokens"] for call in calls),
                cost_usd=round(cost, 6),
                average_latency_ms=round(sum(latencies) / len(latencies), 1),
                p95_latency_ms=round(latencies[min(len(latencies) - 1, math.ceil(0.95 * len(latencies)) - 1)], 1),
                failure_rate=round(sum(1 for call in calls if not call["success"]) / len(calls), 4),
            )
        )
    return days


def _rates(model: str) -> tuple[float, float]:
    # 查不到的模型單價以目前模型代替
    return MODEL_PRICING_USD_PER_MILLION_TOKENS.get(
        model, MODEL_PRICING_USD_PER_MILLION_TOKENS[ACTIVE_MODEL]
    )


def load_billing_mrr() -> list[MRRPoint]:
    # 若放了真實帳務檔 data/mrr_history.csv（欄位 month,mrr），就以它為準
    if not BILLING_CSV.exists():
        return []
    points: list[MRRPoint] = []
    with BILLING_CSV.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            points.append(MRRPoint(month=row["month"].strip(), mrr=float(row["mrr"])))
    return sorted(points, key=lambda point: point.month)[-MRR_HISTORY_MONTHS:]


def summarize_modelops(daily: list[DailyModelOps]) -> ModelOpsSummary:
    requests = sum(day.requests for day in daily)
    total_cost = sum(day.cost_usd for day in daily)
    if requests == 0:
        return ModelOpsSummary(
            model=ACTIVE_MODEL,
            period_days=0,
            total_requests=0,
            total_input_tokens=0,
            total_output_tokens=0,
            total_cost_usd=0,
            budget_usd=MONTHLY_BUDGET_USD,
            budget_used_ratio=0,
            average_latency_ms=0,
            p95_latency_ms=0,
            failure_rate=0,
        )
    return ModelOpsSummary(
        model=ACTIVE_MODEL,
        period_days=len(daily),
        total_requests=requests,
        total_input_tokens=sum(day.input_tokens for day in daily),
        total_output_tokens=sum(day.output_tokens for day in daily),
        total_cost_usd=round(total_cost, 2),
        budget_usd=MONTHLY_BUDGET_USD,
        budget_used_ratio=round(total_cost / MONTHLY_BUDGET_USD, 4),
        average_latency_ms=round(
            sum(day.average_latency_ms * day.requests for day in daily) / requests, 1
        ),
        p95_latency_ms=max(day.p95_latency_ms for day in daily),
        failure_rate=round(
            sum(day.failure_rate * day.requests for day in daily) / requests, 4
        ),
    )


def _outliers(
    values: list[float], labels: list[str], threshold: float = 3.5
) -> list[tuple[str, float, float]]:
    if len(values) < 7:  # 資料太少時不做異常判斷，避免誤報
        return []
    # 以中位數與 MAD（中位數絕對偏差）判斷離群值，比平均值更不易被異常拉偏
    median = statistics.median(values)
    mad = statistics.median(abs(value - median) for value in values)
    if mad == 0:
        return []
    return [
        (label, value, median)
        for label, value in zip(labels, values, strict=True)
        if 0.6745 * abs(value - median) / mad > threshold
    ]


def detect_anomalies(
    mrr_history: list[MRRPoint], daily: list[DailyModelOps]
) -> list[Anomaly]:
    anomalies: list[Anomaly] = []
    dates = [day.date for day in daily]
    for metric, values in (
        ("latency", [day.average_latency_ms for day in daily]),
        ("failure_rate", [day.failure_rate for day in daily]),
        ("cost", [day.cost_usd for day in daily]),
    ):
        for period, value, baseline in _outliers(values, dates):
            anomalies.append(
                Anomaly(
                    metric=metric,
                    period=period,
                    value=round(value, 4),
                    baseline=round(baseline, 4),
                    direction="high" if value > baseline else "low",
                )
            )

    # 營收異常：比較每月成長額是否明顯偏離一般水準
    growth = [
        mrr_history[index].mrr - mrr_history[index - 1].mrr
        for index in range(1, len(mrr_history))
    ]
    months = [point.month for point in mrr_history[1:]]
    for period, value, baseline in _outliers(growth, months):
        anomalies.append(
            Anomaly(
                metric="mrr",
                period=period,
                value=round(value, 2),
                baseline=round(baseline, 2),
                direction="high" if value > baseline else "low",
            )
        )
    return sorted(anomalies, key=lambda item: item.period, reverse=True)


def build_telemetry(records: list[dict]) -> TelemetryResponse:
    today = datetime.now(UTC).date()
    mrr_history = load_billing_mrr()  # 只採用真實帳務檔；沒有就留空，不再推算歷史
    daily = build_modelops_daily(today)
    return TelemetryResponse(
        mrr_source="billing_csv" if mrr_history else "none",
        mrr_history=mrr_history,
        modelops_source="request_log",
        modelops_daily=daily,
        modelops_summary=summarize_modelops(daily),
        anomalies=detect_anomalies(mrr_history, daily),
    )


__all__ = ["build_telemetry", "TelemetryResponse"]
