import csv
import logging
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel
from sklearn.feature_extraction import DictVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, brier_score_loss, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict, train_test_split
from sklearn.pipeline import Pipeline, make_pipeline
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

# Telco 資料檔位置，模型直接用它訓練
DATA_PATH = Path(__file__).resolve().parent / "data" / "WA_Fn-UseC_-Telco-Customer-Churn.csv"
RANDOM_STATE = 42  # 固定亂數種子，讓每次重啟訓練結果一致
TEST_SIZE = 0.2  # 20% 資料留作測試集，訓練時完全不給模型看
HIGH_RISK_THRESHOLD = 0.7  # 高風險：機率 70% 以上（與規劃書一致）
MEDIUM_RISK_THRESHOLD = 0.4  # 中風險：機率 40% 以上、未達高風險


class ChurnModelCard(BaseModel):
    # 模型說明卡：給前端顯示模型的真實成績
    algorithm: str
    features: list[str]
    train_rows: int
    test_rows: int
    base_churn_rate: float  # 資料集整體實際流失比例
    test_roc_auc: float  # 測試集 ROC AUC（排序能力）
    test_accuracy: float  # 測試集準確率（門檻 0.5）
    test_brier_score: float  # Brier 分數，越低代表機率越準
    high_risk_threshold: float
    test_flagged_high_risk: int  # 測試集中被判為高風險（>=70%）的人數
    test_high_risk_precision: float | None  # 這些人真的流失的比例
    calibration: list[dict]  # 機率分桶：預測平均機率 vs 實際流失比例


@dataclass
class TrainedChurnModel:
    pipeline: Pipeline
    out_of_fold: dict[str, float]  # 每位客戶的「交叉驗證外」機率，不含自己訓練
    card: ChurnModelCard


def _is_senior(value: object) -> float:
    # 把 "1" / "Yes" / True 等寫法統一成 1.0 或 0.0
    return 1.0 if str(value).strip().lower() in {"1", "yes", "true"} else 0.0


def build_features(
    *,
    contract: str,
    tenure: float,
    monthly_charges: float,
    internet_service: str,
    payment_method: str,
    paperless_billing: str,
    senior_citizen: object,
) -> dict[str, float | str]:
    # 數值欄位直接放數字；文字欄位交給 DictVectorizer 自動做 one-hot 編碼
    return {
        "tenure": float(tenure),
        "monthly_charges": float(monthly_charges),
        "senior_citizen": _is_senior(senior_citizen),
        "contract": contract.strip(),
        "internet_service": internet_service.strip(),
        "payment_method": payment_method.strip(),
        "paperless_billing": paperless_billing.strip(),
    }


def _load_training_rows() -> tuple[list[str], list[dict], list[int]]:
    ids: list[str] = []
    rows: list[dict] = []
    labels: list[int] = []
    with DATA_PATH.open("r", newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            if not row.get("customerID"):
                continue
            try:
                monthly = float(str(row.get("MonthlyCharges") or "0").replace(",", ""))
                tenure = int(str(row.get("tenure") or "0").strip())
            except ValueError:
                continue
            ids.append(row["customerID"])
            rows.append(
                build_features(
                    contract=row.get("Contract") or "",
                    tenure=tenure,
                    monthly_charges=monthly,
                    internet_service=row.get("InternetService") or "",
                    payment_method=row.get("PaymentMethod") or "",
                    paperless_billing=row.get("PaperlessBilling") or "",
                    senior_citizen=row.get("SeniorCitizen") or "0",
                )
            )
            labels.append(1 if str(row.get("Churn") or "").strip().lower() == "yes" else 0)
    return ids, rows, labels


def _new_pipeline() -> Pipeline:
    # 流程：文字轉 one-hot → 數值標準化 → 邏輯迴歸（機率輸出天然較準，不另外硬調）
    return make_pipeline(
        DictVectorizer(sparse=False),
        StandardScaler(),
        LogisticRegression(max_iter=1000),
    )


def _calibration_table(probabilities: list[float], labels: list[int]) -> list[dict]:
    # 把預測機率分成 5 桶，比較「模型說的機率」與「實際流失比例」是否吻合
    edges = [0.0, 0.2, 0.4, 0.6, 0.7, 0.8, 1.0001]
    table: list[dict] = []
    for low, high in zip(edges[:-1], edges[1:], strict=True):
        bucket = [
            (probability, label)
            for probability, label in zip(probabilities, labels, strict=True)
            if low <= probability < high
        ]
        if not bucket:
            continue
        table.append(
            {
                "range": f"{low:.0%}-{min(high, 1.0):.0%}",
                "count": len(bucket),
                "predicted": round(sum(p for p, _ in bucket) / len(bucket), 4),
                "actual": round(sum(label for _, label in bucket) / len(bucket), 4),
            }
        )
    return table


@lru_cache(maxsize=1)
def get_model() -> TrainedChurnModel | None:
    # 找不到資料檔就回傳 None，呼叫端會退回規則評分
    if not DATA_PATH.exists():
        return None
    try:
        ids, rows, labels = _load_training_rows()
        if len(rows) < 200 or len(set(labels)) < 2:
            return None

        # 1) 切分訓練 / 測試集（依流失比例分層），只用測試集評估成績
        (train_rows, test_rows, train_labels, test_labels) = train_test_split(
            rows, labels, test_size=TEST_SIZE, stratify=labels, random_state=RANDOM_STATE
        )
        evaluation_model = _new_pipeline().fit(train_rows, train_labels)
        test_probabilities = [float(p) for p in evaluation_model.predict_proba(test_rows)[:, 1]]
        flagged = [
            label
            for probability, label in zip(test_probabilities, test_labels, strict=True)
            if probability >= HIGH_RISK_THRESHOLD
        ]

        # 2) 每位客戶的「外部」機率：5 折交叉驗證，確保該客戶沒參與訓練自己的預測
        folds = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
        out_of_fold_probabilities = cross_val_predict(
            _new_pipeline(), rows, labels, cv=folds, method="predict_proba"
        )[:, 1]

        # 3) 正式上線的模型用全部資料重新訓練，給資料集以外的新客戶使用
        final_pipeline = _new_pipeline().fit(rows, labels)

        card = ChurnModelCard(
            algorithm="Logistic Regression (scikit-learn)",
            features=sorted(rows[0]),
            train_rows=len(train_rows),
            test_rows=len(test_rows),
            base_churn_rate=round(sum(labels) / len(labels), 4),
            test_roc_auc=round(float(roc_auc_score(test_labels, test_probabilities)), 4),
            test_accuracy=round(
                float(accuracy_score(test_labels, [p >= 0.5 for p in test_probabilities])), 4
            ),
            test_brier_score=round(float(brier_score_loss(test_labels, test_probabilities)), 4),
            high_risk_threshold=HIGH_RISK_THRESHOLD,
            test_flagged_high_risk=len(flagged),
            test_high_risk_precision=(
                round(sum(flagged) / len(flagged), 4) if flagged else None
            ),
            calibration=_calibration_table(test_probabilities, test_labels),
        )
        return TrainedChurnModel(
            pipeline=final_pipeline,
            out_of_fold={
                customer_id: round(float(probability), 4)
                for customer_id, probability in zip(ids, out_of_fold_probabilities, strict=True)
            },
            card=card,
        )
    except Exception:
        logger.exception("Churn model training failed; falling back to rules")
        return None


def predict_probabilities(feature_rows: list[dict]) -> list[float] | None:
    # 對資料集以外的新客戶，用全資料訓練的模型預測流失機率
    model = get_model()
    if model is None or not feature_rows:
        return None if model is None else []
    return [round(float(p), 4) for p in model.pipeline.predict_proba(feature_rows)[:, 1]]


def known_probability(customer_id: str) -> float | None:
    # 資料集內的客戶回傳交叉驗證外的機率，避免「自己預測自己」造成成績灌水
    model = get_model()
    return None if model is None else model.out_of_fold.get(customer_id)
