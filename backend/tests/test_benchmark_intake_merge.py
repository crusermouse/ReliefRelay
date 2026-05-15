import timeit
import copy
from pydantic import BaseModel, Field
from typing import Optional, Literal, List

class IntakeRecord(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    location_found: Optional[str] = None
    presenting_issues: list[str] = Field(default_factory=list)
    medical_urgency: Literal["none", "low", "medium", "high", "critical"] = "none"
    shelter_needed: bool = False
    food_needed: bool = False
    water_needed: bool = False
    medication_needed: Optional[str] = None
    family_members: int = 1
    special_needs: Optional[str] = None
    language_preference: str = "English"
    missing_information: list[str] = Field(default_factory=list)
    extraction_confidence: Literal["low", "medium", "high"] = "low"
    raw_transcription: Optional[str] = None

def baseline_merge(base_record, new_record):
    for field, val in new_record.dict().items():
        if val and not getattr(base_record, field):
            setattr(base_record, field, val)

def optimized_merge(base_record, new_record):
    for field in IntakeRecord.model_fields:
        val = getattr(new_record, field)
        if val and not getattr(base_record, field):
            setattr(base_record, field, val)

def check_correctness():
    base = IntakeRecord(name="Alice", location_found="Downtown", medical_urgency="low")
    new_data = IntakeRecord(age=30, shelter_needed=True, food_needed=True, medical_urgency="medium")

    b1 = copy.deepcopy(base)
    baseline_merge(b1, new_data)

    b2 = copy.deepcopy(base)
    optimized_merge(b2, new_data)

    assert b1.model_dump() == b2.model_dump(), "Behavior has changed!"
    print("Correctness test passed!")

if __name__ == '__main__':
    check_correctness()

    base = IntakeRecord(name="Alice", location_found="Downtown", medical_urgency="low")
    new_data = IntakeRecord(age=30, shelter_needed=True, food_needed=True, medical_urgency="medium")

    def run_baseline():
        b = copy.copy(base)
        baseline_merge(b, new_data)

    def run_optimized():
        b = copy.copy(base)
        optimized_merge(b, new_data)

    n = 10000
    baseline_time = timeit.timeit(run_baseline, number=n)
    optimized_time = timeit.timeit(run_optimized, number=n)

    print(f"Baseline Time: {baseline_time:.4f}s")
    print(f"Optimized Time: {optimized_time:.4f}s")
    print(f"Improvement: {(baseline_time - optimized_time) / baseline_time * 100:.2f}%")
