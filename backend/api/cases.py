from fastapi import APIRouter, HTTPException
from tools.case_manager import list_cases, get_case

router = APIRouter()


@router.get("/cases")
async def get_cases(limit: int = 50):
    """Return the most recent cases, newest first."""
    cases = list_cases(limit=limit)
    return {"cases": cases, "total": len(cases)}


@router.get("/cases/{case_id}")
async def get_case_by_id(case_id: str):
    """Return a single case by ID."""
    case = get_case(case_id)
    if not case:
        raise HTTPException(404, f"Case {case_id} not found")
    return case
