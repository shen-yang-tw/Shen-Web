import sqlite3
import threading
from contextlib import closing
from datetime import UTC, datetime

from opslog import DB_PATH

_lock = threading.Lock()

_SCHEMA = """
CREATE TABLE IF NOT EXISTS retention_actions (
    customer_id TEXT PRIMARY KEY,
    status TEXT NOT NULL CHECK (status IN ('queued', 'in_progress', 'completed')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS retention_action_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'in_progress', 'completed')),
    created_at TEXT NOT NULL
);
"""

_TRANSITIONS = {
    "queued": {"in_progress"},
    "in_progress": {"completed"},
    "completed": {"queued"},
}


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH, timeout=10)
    connection.executescript(_SCHEMA)
    return connection


def list_actions() -> list[dict[str, str]]:
    with _lock, closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            "SELECT customer_id, status, created_at, updated_at"
            " FROM retention_actions ORDER BY updated_at DESC"
        ).fetchall()
    return [dict(row) for row in rows]


def create_action(customer_id: str) -> dict[str, str]:
    now = datetime.now(UTC).isoformat()
    with _lock, closing(_connect()) as connection, connection:
        cursor = connection.execute(
            "INSERT OR IGNORE INTO retention_actions"
            " (customer_id, status, created_at, updated_at) VALUES (?, 'queued', ?, ?)",
            (customer_id, now, now),
        )
        if cursor.rowcount:
            connection.execute(
                "INSERT INTO retention_action_events (customer_id, status, created_at)"
                " VALUES (?, 'queued', ?)",
                (customer_id, now),
            )
    action = get_action(customer_id)
    if action is None:
        raise RuntimeError("Retention action was not persisted.")
    return action


def get_action(customer_id: str) -> dict[str, str] | None:
    with _lock, closing(_connect()) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            "SELECT customer_id, status, created_at, updated_at"
            " FROM retention_actions WHERE customer_id = ?",
            (customer_id,),
        ).fetchone()
    return dict(row) if row is not None else None


def transition_action(customer_id: str, status: str) -> dict[str, str] | None:
    now = datetime.now(UTC).isoformat()
    with _lock, closing(_connect()) as connection, connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            "SELECT status FROM retention_actions WHERE customer_id = ?",
            (customer_id,),
        ).fetchone()
        if row is None:
            return None
        current_status = row["status"]
        if status not in _TRANSITIONS[current_status]:
            raise ValueError(f"Cannot transition retention action from {current_status} to {status}.")
        connection.execute(
            "UPDATE retention_actions SET status = ?, updated_at = ? WHERE customer_id = ?",
            (status, now, customer_id),
        )
        connection.execute(
            "INSERT INTO retention_action_events (customer_id, status, created_at)"
            " VALUES (?, ?, ?)",
            (customer_id, status, now),
        )
    return get_action(customer_id)
