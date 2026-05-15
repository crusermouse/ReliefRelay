import sys
from unittest.mock import MagicMock

# Mock required dependencies to avoid ImportErrors during test collection
class MockSettings:
    GEMMA_MAX_CONCURRENCY = 1
    CASES_DB = ":memory:" # use in-memory sqlite db for tests
    RESOURCES_DB = ":memory:"

class MockConfig:
    BaseSettings = object

mock_pydantic_settings = MagicMock()
mock_pydantic_settings.BaseSettings = object
sys.modules['pydantic_settings'] = mock_pydantic_settings
sys.modules['fastapi'] = MagicMock()
sys.modules['ollama'] = MagicMock()
sys.modules['httpx'] = MagicMock()
sys.modules['jinja2'] = MagicMock()
sys.modules['config'] = MagicMock()
sys.modules['config'].settings = MockSettings()

from ai.agent import _resource_types_for_case, RESOURCE_PRIORITY

def test_resource_types_for_case_all_resources():
    # Construct an intake record that triggers all 5 resource types:
    # 1. shelter -> shelter_needed
    # 2. food -> food_needed
    # 3. transport -> water_needed
    # 4. medical -> medical_urgency in {medium, high, critical}
    # 5. escalation -> triage_level in {RED, ORANGE}
    intake_record = {
        "shelter_needed": True,
        "food_needed": True,
        "water_needed": True,
        "medical_urgency": "critical",
    }
    triage_level = "RED"

    result = _resource_types_for_case(intake_record, triage_level)

    # Assert it returns exactly the ordered resources
    assert result == RESOURCE_PRIORITY
