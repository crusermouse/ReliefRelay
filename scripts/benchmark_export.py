import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

import time
import sqlite3
import uuid
import json
from datetime import datetime, timezone
from pathlib import Path

# Add backend directory to path
from tools.case_manager import list_cases, _get_conn
from api.export import export_cases_bulk
import asyncio

def insert_dummy_cases(limit):
    conn = _get_conn()
    cases = []
    now = datetime.now(timezone.utc).isoformat()
    for _ in range(limit):
        case_id = f"CASE-{uuid.uuid4().hex[:6].upper()}"
        intake_data = {
            "name": "Test User",
            "age": "30",
            "medical_urgency": "high",
            "family_members": 2,
            "presenting_issues": ["trauma", "starvation"]
        }
        cases.append((
            case_id,
            "RED",
            json.dumps(intake_data),
            now,
            now
        ))

    conn.executemany(
        """INSERT INTO cases (case_id, triage_level, intake_data, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)""",
        cases
    )
    conn.commit()
    conn.close()
    return [c[0] for c in cases]

def delete_cases(case_ids):
    conn = _get_conn()
    placeholders = ",".join("?" for _ in case_ids)
    conn.execute(f"DELETE FROM cases WHERE case_id IN ({placeholders})", case_ids)
    conn.commit()
    conn.close()

async def run_benchmark():
    num_cases = 500
    print(f"Setting up {num_cases} dummy cases...")
    case_ids = insert_dummy_cases(num_cases)

    try:
        print("Running benchmark...")
        start_time = time.perf_counter()

        # we run the actual function
        await export_cases_bulk(limit=num_cases)

        end_time = time.perf_counter()
        duration = end_time - start_time
        print(f"Time taken to build bulk export ({num_cases} cases): {duration:.4f} seconds")
    finally:
        print("Cleaning up dummy cases...")
        delete_cases(case_ids)

if __name__ == "__main__":
    asyncio.run(run_benchmark())
