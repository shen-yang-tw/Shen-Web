import os
import sqlite3
import threading
from contextlib import closing
from datetime import UTC, datetime
from pathlib import Path

# 真實請求紀錄存放位置；可用環境變數改路徑（例如掛載 Docker volume）
DB_PATH = Path(
    os.getenv("MODELOPS_DB_PATH", Path(__file__).resolve().parent / "data" / "modelops.db")
)
_lock = threading.Lock()  # 避免多個請求同時寫入造成衝突

_SCHEMA = """
CREATE TABLE IF NOT EXISTS model_calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    latency_ms REAL NOT NULL,
    success INTEGER NOT NULL
)
"""


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.execute(_SCHEMA)
    return connection


def record_call(
    model: str, input_tokens: int, output_tokens: int, latency_ms: float, success: bool
) -> None:
    # 每次真的呼叫大模型後，就把 Token、延遲與成敗寫進資料庫
    with _lock, closing(_connect()) as connection, connection:
        connection.execute(
            "INSERT INTO model_calls (created_at, model, input_tokens, output_tokens,"
            " latency_ms, success) VALUES (?, ?, ?, ?, ?, ?)",
            (
                datetime.now(UTC).isoformat(),
                model,
                input_tokens,
                output_tokens,
                latency_ms,
                int(success),
            ),
        )


def read_calls(since_iso: str) -> list[dict]:
    # 讀出指定時間之後的所有真實呼叫紀錄
    with _lock, closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            "SELECT created_at, model, input_tokens, output_tokens, latency_ms, success"
            " FROM model_calls WHERE created_at >= ? ORDER BY created_at",
            (since_iso,),
        ).fetchall()
    return [dict(row) for row in rows]
