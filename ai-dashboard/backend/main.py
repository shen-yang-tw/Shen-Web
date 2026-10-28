import asyncio
import csv
import os
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ai import router as ai_router
from churn_model import (
    HIGH_RISK_THRESHOLD,
    MEDIUM_RISK_THRESHOLD,
    ChurnModelCard,
    get_model,
    known_probability,
)
from retention import create_action, list_actions, transition_action
from telemetry import TelemetryResponse, build_telemetry

DATA_PATH = Path(__file__).resolve().parent / "data" / "WA_Fn-UseC_-Telco-Customer-Churn.csv"

app = FastAPI()

RetentionStatus = Literal["queued", "in_progress", "completed"]


class RetentionAction(BaseModel):
    customer_id: str
    status: RetentionStatus
    created_at: str
    updated_at: str


class CreateRetentionAction(BaseModel):
    customer_id: str


class TransitionRetentionAction(BaseModel):
    status: RetentionStatus


@app.on_event("startup")
async def warm_up_churn_model() -> None:
    # 啟動時在背景執行緒先訓練模型，避免第一位使用者的請求等待十幾秒
    asyncio.get_running_loop().run_in_executor(None, get_model)


cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(ai_router)


def _to_float(value: str | None) -> float:
    if value is None:
        return 0.0
    cleaned = str(value).strip().replace(",", "")
    if not cleaned or cleaned.lower() in {"nan", "none", "null"}:
        return 0.0
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def _risk_level(probability: float) -> str:
    if probability >= HIGH_RISK_THRESHOLD:
        return "High"
    if probability >= MEDIUM_RISK_THRESHOLD:
        return "Medium"
    return "Low"


def _score_customer(row: dict) -> float:
    probability = 0.12

    contract = row.get("Contract", "Month-to-month")
    if contract == "Month-to-month":
        probability += 0.34
    elif contract == "One year":
        probability += 0.12
    else:
        probability += 0.04

    tenure = int(row.get("tenure", 0) or 0)
    if tenure <= 12:
        probability += 0.22
    elif tenure <= 24:
        probability += 0.08

    monthly_charges = _to_float(row.get("MonthlyCharges"))
    if monthly_charges > 75:
        probability += 0.12

    if row.get("InternetService") == "Fiber optic":
        probability += 0.08
    if row.get("PaymentMethod") == "Electronic check":
        probability += 0.1
    if row.get("PaperlessBilling") == "Yes":
        probability += 0.05
    if row.get("SeniorCitizen") == "1":
        probability += 0.09

    if probability < 0:
        probability = 0.0
    if probability > 1:
        probability = 1.0
    return round(probability, 4)


def load_telco_customers() -> list[dict]:
    if not DATA_PATH.exists():
        return []

    records: list[dict] = []
    with DATA_PATH.open("r", newline="", encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            if not row.get("customerID"):
                continue

            try:
                tenure = int((row.get("tenure") or "0").strip())
            except ValueError:
                tenure = 0

            churn_flag = str(row.get("Churn") or "No").strip().lower() == "yes"
            # 優先採用訓練模型的（交叉驗證外）機率；模型不可用時才退回規則評分
            model_probability = known_probability(row.get("customerID", ""))
            probability = model_probability if model_probability is not None else _score_customer(row)
            record = {
                "customer_id": row.get("customerID", ""),
                "tenure": tenure,
                "monthly_charges": round(_to_float(row.get("MonthlyCharges")), 2),
                "total_charges": round(_to_float(row.get("TotalCharges")), 2),
                "contract": row.get("Contract", "Month-to-month"),
                "internet_service": row.get("InternetService"),
                "payment_method": row.get("PaymentMethod"),
                "paperless_billing": row.get("PaperlessBilling"),
                "senior_citizen": row.get("SeniorCitizen"),
                "actual_churn": churn_flag,
                "churn_probability": probability,
                "risk_level": _risk_level(probability),
            }
            records.append(record)

    return records


@app.get("/")
def root():
    return {"status": "FastAPI is running!"}


@app.get("/api/health")
def read_health():
    return {"status": "ok", "message": "Hello from FastAPI!"}


@app.get("/api/v1/ml/churn-model", response_model=ChurnModelCard)
def get_churn_model_card():
    # 回傳模型在「訓練時沒看過的測試集」上的真實成績
    model = get_model()
    if model is None:
        raise HTTPException(status_code=503, detail="Churn model is not available.")
    return model.card


@app.get("/api/v1/ops/telemetry", response_model=TelemetryResponse)
def get_telemetry():
    return build_telemetry(load_telco_customers())


@app.get("/api/customers")
def get_customers():
    records = load_telco_customers()
    return {
        "count": len(records),
        "records": records,
    }


@app.get("/api/v1/retention/actions", response_model=list[RetentionAction])
def get_retention_actions():
    return list_actions()


@app.post(
    "/api/v1/retention/actions",
    response_model=RetentionAction,
    status_code=status.HTTP_201_CREATED,
)
def post_retention_action(payload: CreateRetentionAction):
    customer = next(
        (row for row in load_telco_customers() if row["customer_id"] == payload.customer_id),
        None,
    )
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer was not found.")
    if customer["actual_churn"]:
        raise HTTPException(
            status_code=409,
            detail="A churned customer cannot be added to the retention action queue.",
        )
    if customer["risk_level"] != "High":
        raise HTTPException(
            status_code=409,
            detail="Only customers currently classified as high risk can be queued.",
        )
    return create_action(payload.customer_id)


@app.patch(
    "/api/v1/retention/actions/{customer_id}",
    response_model=RetentionAction,
)
def patch_retention_action(customer_id: str, payload: TransitionRetentionAction):
    try:
        action = transition_action(customer_id, payload.status)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    if action is None:
        raise HTTPException(status_code=404, detail="Retention action was not found.")
    return action
