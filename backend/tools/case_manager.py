import sqlite3
import uuid
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from config import settings


def _get_conn() -> sqlite3.Connection:
    db_path = Path(settings.CASES_DB)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn


def _init_db():
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS cases (
            case_id     TEXT PRIMARY KEY,
            triage_level TEXT NOT NULL,
            intake_data  TEXT NOT NULL,
            action_plan  TEXT,
            created_at   TEXT NOT NULL,
            updated_at   TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


_init_db()


def create_case_db(intake_data: dict, triage_level: str) -> str:
    """Save a new intake case to SQLite and return its case_id."""
    case_id = f"CASE-{uuid.uuid4().hex[:6].upper()}"
    now = datetime.now(timezone.utc).isoformat()
    conn = _get_conn()
    conn.execute(
        """INSERT INTO cases (case_id, triage_level, intake_data, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)""",
        (case_id, triage_level, json.dumps(intake_data), now, now),
    )
    conn.commit()
    conn.close()
    return case_id


def update_case_db(case_id: str, action_plan: str) -> None:
    """Update an existing case with the generated action plan."""
    if not re.match(r"^CASE-[0-9A-F]{6}$", case_id):
        return

    now = datetime.now(timezone.utc).isoformat()
    conn = _get_conn()
    conn.execute(
        "UPDATE cases SET action_plan = ?, updated_at = ? WHERE case_id = ?",
        (action_plan, now, case_id),
    )
    conn.commit()
    conn.close()


def get_case(case_id: str) -> dict | None:
    """Fetch a single case by ID."""
    if not re.match(r"^CASE-[0-9A-F]{6}$", case_id):
        return None

    conn = _get_conn()
    row = conn.execute("SELECT * FROM cases WHERE case_id = ?", (case_id,)).fetchone()
    conn.close()
    if not row:
        return None
    return _row_to_dict(row)


def list_cases(limit: int = 50) -> list[dict]:
    """Return the most recent cases, newest first."""
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM cases ORDER BY created_at DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()
    return [_row_to_dict(r) for r in rows]


def _row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    d["intake_data"] = json.loads(d["intake_data"])
    return d
