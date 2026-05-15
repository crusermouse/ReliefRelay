import pytest
from tools.case_manager import get_case, update_case_db

def test_get_case_sql_injection_defense():
    # Input that could be part of a SQL injection attack
    malicious_id = "CASE-123' OR '1'='1"

    # Should safely return None and not query the DB or raise a DB exception
    case_data = get_case(malicious_id)
    assert case_data is None

def test_update_case_sql_injection_defense():
    malicious_id = "CASE-123'; DROP TABLE cases;--"

    # Should safely return without querying the DB or raising a DB exception
    # and return value is None
    result = update_case_db(malicious_id, "Some action plan")
    assert result is None
