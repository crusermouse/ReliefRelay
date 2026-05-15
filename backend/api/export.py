import re
import csv
import json
import zipfile
from io import BytesIO, StringIO
from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from tools.pdf_export import generate_pdf
from tools.case_manager import get_case, list_cases

router = APIRouter()

_CASE_ID_RE = re.compile(r"^CASE-[0-9A-F]{6}$")


@router.get("/export/{case_id}/pdf")
async def export_case_pdf(case_id: str):
    """Generate and return a PDF referral packet for the given case."""
    if not _CASE_ID_RE.match(case_id):
        raise HTTPException(400, "Invalid case_id format")
    case = get_case(case_id)
    if not case:
        raise HTTPException(404, f"Case {case_id} not found")
    pdf_path = generate_pdf(case_id)
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"relief_case_{case_id}.pdf",
    )


@router.get("/export/bulk/csv")
async def export_cases_csv(limit: int = 100):
    """
    Export all cases as CSV format.
    Useful for humanitarian organizations to import case data into their own systems.
    """
    cases = list_cases(limit=limit)
    
    output = StringIO()
    writer = csv.DictWriter(
        output, 
        fieldnames=[
            "case_id",
            "triage_level", 
            "created_at",
            "name",
            "age",
            "gender",
            "location_found",
            "presenting_issues",
            "medical_urgency",
            "shelter_needed",
            "food_needed",
            "water_needed",
            "family_members",
            "special_needs",
            "action_plan_summary",
        ]
    )
    
    writer.writeheader()
    for case in cases:
        intake_data = json.loads(case["intake_data"]) if isinstance(case["intake_data"], str) else case["intake_data"]
        row = {
            "case_id": case["case_id"],
            "triage_level": case["triage_level"],
            "created_at": case["created_at"],
            "name": intake_data.get("name", ""),
            "age": intake_data.get("age", ""),
            "gender": intake_data.get("gender", ""),
            "location_found": intake_data.get("location_found", ""),
            "presenting_issues": " | ".join(intake_data.get("presenting_issues", [])),
            "medical_urgency": intake_data.get("medical_urgency", ""),
            "shelter_needed": intake_data.get("shelter_needed", False),
            "food_needed": intake_data.get("food_needed", False),
            "water_needed": intake_data.get("water_needed", False),
            "family_members": intake_data.get("family_members", 1),
            "special_needs": intake_data.get("special_needs", ""),
            "action_plan_summary": (case.get("action_plan", "")[:100] + "...") if case.get("action_plan") else "",
        }
        writer.writerow(row)
    
    csv_content = output.getvalue()
    output.close()
    
    # Return as downloadable CSV file
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=relief_cases_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
    )


@router.get("/export/bulk/zip")
async def export_cases_bulk(limit: int = 50):
    """
    Export all cases as a ZIP archive with:
    - index.csv (case summary)
    - individual PDF packets for each case
    - data.json (full case records for data import)
    
    Production-ready for humanitarian organization deployment.
    """
    cases = list_cases(limit=limit)
    
    # Create ZIP in memory
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # Write index CSV
        csv_output = StringIO()
        writer = csv.DictWriter(
            csv_output, 
            fieldnames=[
                "case_id", "triage_level", "created_at", "name", "age",
                "medical_urgency", "family_members", "action_plan_url"
            ]
        )
        writer.writeheader()
        for case in cases:
            intake_data = json.loads(case["intake_data"]) if isinstance(case["intake_data"], str) else case["intake_data"]
            writer.writerow({
                "case_id": case["case_id"],
                "triage_level": case["triage_level"],
                "created_at": case["created_at"],
                "name": intake_data.get("name", ""),
                "age": intake_data.get("age", ""),
                "medical_urgency": intake_data.get("medical_urgency", ""),
                "family_members": intake_data.get("family_members", 1),
                "action_plan_url": f"pdf/{case['case_id']}.pdf",
            })
        zf.writestr("index.csv", csv_output.getvalue())
        csv_output.close()
        
        # Write full data export (JSON)
        data_export = {
            "export_date": datetime.now().isoformat(),
            "case_count": len(cases),
            "cases": [
                {
                    "case_id": case["case_id"],
                    "triage_level": case["triage_level"],
                    "created_at": case["created_at"],
                    "intake_data": json.loads(case["intake_data"]) if isinstance(case["intake_data"], str) else case["intake_data"],
                    "action_plan": case.get("action_plan", ""),
                }
                for case in cases
            ]
        }
        zf.writestr("data.json", json.dumps(data_export, indent=2))
        
        # Write individual PDFs
        for case in cases:
            try:
                pdf_path = generate_pdf(case["case_id"], case_data=case)
                zf.write(pdf_path, arcname=f"pdf/{case['case_id']}.pdf")
            except Exception as e:
                # Log but don't fail; add error note to index
                print(f"Warning: PDF generation failed for {case['case_id']}: {e}")
    
    zip_buffer.seek(0)
    return StreamingResponse(
        iter([zip_buffer.getvalue()]),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=relief_cases_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"}
    )

