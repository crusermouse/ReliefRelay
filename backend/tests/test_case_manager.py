import importlib
import sys
from unittest.mock import MagicMock

import pytest

if isinstance(sys.modules.get("tools"), MagicMock):
    del sys.modules["tools"]
if isinstance(sys.modules.get("tools.case_manager"), MagicMock):
    del sys.modules["tools.case_manager"]

case_manager = importlib.import_module("tools.case_manager")
create_case_db = case_manager.create_case_db
get_case = case_manager.get_case
update_case_db = case_manager.update_case_db
list_cases = case_manager.list_cases

pytestmark = pytest.mark.usefixtures("fresh_db")

def test_create_case_db_returns_non_empty_string_id():
    case_id = create_case_db({"name": "Test User"}, "Urgent")
    assert isinstance(case_id, str)
    assert len(case_id) > 0

def test_create_case_db_different_data_produces_different_ids():
    id1 = create_case_db({"name": "User 1"}, "Urgent")
    id2 = create_case_db({"name": "User 2"}, "Routine")
    assert id1 != id2

def test_create_case_db_record_is_retrievable_via_get_case():
    intake_data = {"name": "Test User", "age": 30}
    triage_level = "Routine"
    case_id = create_case_db(intake_data, triage_level)

    retrieved_case = get_case(case_id)
    assert retrieved_case is not None
    assert retrieved_case["case_id"] == case_id
    assert retrieved_case["triage_level"] == triage_level
    assert retrieved_case["intake_data"] == intake_data

def test_get_case_returns_correct_dict_for_known_id():
    intake_data = {"symptoms": "headache"}
    triage_level = "Routine"
    case_id = create_case_db(intake_data, triage_level)

    case_data = get_case(case_id)
    assert case_data["case_id"] == case_id
    assert case_data["intake_data"] == intake_data
    assert case_data["triage_level"] == triage_level

def test_get_case_returns_none_for_missing_id():
    case_data = get_case("CASE-NONEXISTENT")
    assert case_data is None

def test_get_case_all_expected_keys_are_present():
    case_id = create_case_db({"key": "value"}, "Urgent")
    case_data = get_case(case_id)

    expected_keys = {"case_id", "triage_level", "intake_data", "action_plan", "created_at", "updated_at"}
    assert set(case_data.keys()) == expected_keys

def test_update_case_db_reflected_in_get_case():
    case_id = create_case_db({"name": "Test"}, "Urgent")

    action_plan = "Drink water and rest."
    update_case_db(case_id, action_plan)

    updated_case = get_case(case_id)
    assert updated_case["action_plan"] == action_plan

def test_update_case_db_non_existent_does_not_raise():
    # Should run without raising an exception
    update_case_db("CASE-NONEXISTENT", "Some plan")

def test_list_cases_returns_empty_list_when_no_cases():
    cases = list_cases()
    assert isinstance(cases, list)
    assert len(cases) == 0

def test_list_cases_returns_all_inserted_cases_below_limit():
    create_case_db({"id": 1}, "Routine")
    create_case_db({"id": 2}, "Urgent")
    create_case_db({"id": 3}, "Emergency")

    cases = list_cases(limit=10)
    assert len(cases) == 3

def test_list_cases_respects_limit_parameter():
    for i in range(5):
        create_case_db({"index": i}, "Routine")

    cases = list_cases(limit=3)
    assert len(cases) == 3

def test_list_cases_ordered_by_creation_time_descending():
    import time

    # We add a slight sleep to ensure distinct creation times,
    # though datetime.now() inside create_case_db usually captures microsecond differences.
    id1 = create_case_db({"order": 1}, "Routine")
    time.sleep(0.01)
    id2 = create_case_db({"order": 2}, "Urgent")
    time.sleep(0.01)
    id3 = create_case_db({"order": 3}, "Emergency")

    cases = list_cases()
    assert len(cases) == 3
    assert cases[0]["case_id"] == id3
    assert cases[1]["case_id"] == id2
    assert cases[2]["case_id"] == id1
