import sys
import os
import time
import cProfile
import pstats
import io

# Add backend directory to path so imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from unittest.mock import patch, MagicMock

# Remove mocked fastapi so we use real fastapi since we installed it earlier!
if 'pydantic_settings' in sys.modules: del sys.modules['pydantic_settings']
if 'fastapi' in sys.modules: del sys.modules['fastapi']
if 'ollama' in sys.modules: del sys.modules['ollama']
if 'reportlab' in sys.modules: del sys.modules['reportlab']
if 'reportlab.lib' in sys.modules: del sys.modules['reportlab.lib']
if 'reportlab.lib.units' in sys.modules: del sys.modules['reportlab.lib.units']
if 'reportlab.lib.colors' in sys.modules: del sys.modules['reportlab.lib.colors']
if 'reportlab.lib.pagesizes' in sys.modules: del sys.modules['reportlab.lib.pagesizes']
if 'reportlab.pdfbase' in sys.modules: del sys.modules['reportlab.pdfbase']
if 'reportlab.pdfbase.ttfonts' in sys.modules: del sys.modules['reportlab.pdfbase.ttfonts']
if 'reportlab.pdfbase.pdfmetrics' in sys.modules: del sys.modules['reportlab.pdfbase.pdfmetrics']
if 'reportlab.platypus' in sys.modules: del sys.modules['reportlab.platypus']
if 'reportlab.lib.styles' in sys.modules: del sys.modules['reportlab.lib.styles']

sys.modules['ollama'] = MagicMock()

# Mock settings so we use an in-memory DB or temporary file
from config import settings
# Create a test DB path instead of default
test_db_path = "/tmp/test_benchmark_cases.db"
settings.CASES_DB = test_db_path

from tools.case_manager import list_cases, get_case, _get_conn, _init_db
from api.export import export_cases_bulk
import uuid
import json
from datetime import datetime, timezone
import asyncio

def setup_mock_data(num_cases=50):
    _init_db()
    conn = _get_conn()
    conn.execute("DELETE FROM cases")
    now = datetime.now(timezone.utc).isoformat()
    for _ in range(num_cases):
        case_id = f"CASE-{uuid.uuid4().hex[:6].upper()}"
        triage_level = "GREEN"
        intake_data = {"name": "Test User", "age": 30}
        conn.execute(
            """INSERT INTO cases (case_id, triage_level, intake_data, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?)""",
            (case_id, triage_level, json.dumps(intake_data), now, now),
        )
    conn.commit()
    conn.close()

def run_scenario(use_optimization: bool, num_cases: int):
    setup_mock_data(num_cases)

    # Using patch to dynamically toggle optimization
    import api.export
    import tools.pdf_export

    def mock_generate_pdf(case_id, case_data=None):
        if use_optimization:
            # Emulate optimized behavior (what we just implemented)
            if case_data is None:
                get_case(case_id)
            time.sleep(0.01)
            return "/tmp/fake.pdf"
        else:
            # Emulate baseline behavior
            get_case(case_id)
            time.sleep(0.01)
            return "/tmp/fake.pdf"

    start_time = time.time()

    pr = cProfile.Profile()
    pr.enable()

    # Mock generate_pdf to emulate behavior and avoid writing to disk
    with patch('api.export.generate_pdf', side_effect=mock_generate_pdf):
        # export_cases_bulk returns a StreamingResponse
        # To execute the code, we actually need to iterate through the generator
        # But wait, StreamingResponse handles it internally. Let's see what export_cases_bulk does.
        # It creates zip file in memory and then returns StreamingResponse
        # So most work is done before StreamingResponse is returned.
        response = asyncio.run(export_cases_bulk(limit=num_cases))

    pr.disable()
    end_time = time.time()

    # Get stats to count DB calls
    s = io.StringIO()
    ps = pstats.Stats(pr, stream=s).sort_stats('calls')
    ps.print_stats("get_case")

    stats_output = s.getvalue()
    db_calls = 0
    for line in stats_output.split('\n'):
        if "get_case" in line and "case_manager.py" in line:
            parts = line.split()
            if len(parts) > 0 and parts[0].isdigit():
                db_calls = int(parts[0])
                break

    return end_time - start_time, db_calls

def main():
    print("Running benchmark...")
    num_cases = 50

    # Run Baseline
    baseline_time, baseline_calls = run_scenario(use_optimization=False, num_cases=num_cases)

    # Run Optimized
    optimized_time, optimized_calls = run_scenario(use_optimization=True, num_cases=num_cases)

    print("\n--- Benchmark Results ---")
    print(f"{'Cases':<10} | {'Time (Before)':<15} | {'Time (After)':<15} | {'DB Calls (Before)':<20} | {'DB Calls (After)':<20}")
    print("-" * 85)
    print(f"{num_cases:<10} | {baseline_time:<15.4f} | {optimized_time:<15.4f} | {baseline_calls:<20} | {optimized_calls:<20}")
    print("-" * 85)

if __name__ == "__main__":
    # Create an empty fake pdf for zipfile to find
    with open("/tmp/fake.pdf", "w") as f:
        f.write("fake pdf")
    main()

    # Cleanup
    if os.path.exists(test_db_path):
        os.remove(test_db_path)
    if os.path.exists("/tmp/fake.pdf"):
        os.remove("/tmp/fake.pdf")
