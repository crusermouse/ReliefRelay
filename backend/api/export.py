from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from tools.pdf_export import generate_pdf
from tools.case_manager import get_case

router = APIRouter()


@router.get("/export/{case_id}/pdf")
async def export_case_pdf(case_id: str):
    """Generate and return a PDF referral packet for the given case."""
    case = get_case(case_id)
    if not case:
        raise HTTPException(404, f"Case {case_id} not found")
    pdf_path = generate_pdf(case_id)
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"relief_case_{case_id}.pdf",
    )
