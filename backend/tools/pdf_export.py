import json
from pathlib import Path
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from tools.case_manager import get_case

OUTPUT_DIR = Path("/tmp/reliefRelay_pdfs")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

TRIAGE_COLORS = {
    "RED": colors.HexColor("#ef4444"),
    "ORANGE": colors.HexColor("#f97316"),
    "YELLOW": colors.HexColor("#f59e0b"),
    "GREEN": colors.HexColor("#22c55e"),
}


def generate_pdf(case_id: str) -> str:
    """Generate a printable referral PDF for the given case_id."""
    case = get_case(case_id)
    if not case:
        raise ValueError(f"Case {case_id} not found")

    output_path = OUTPUT_DIR / f"relief_case_{case_id}.pdf"
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    story = []

    # ── Header ────────────────────────────────────────────────────────
    triage_level = case.get("triage_level", "GREEN")
    triage_color = TRIAGE_COLORS.get(triage_level, colors.green)

    title_style = ParagraphStyle(
        "Title",
        parent=styles["Title"],
        fontSize=18,
        textColor=colors.HexColor("#1e293b"),
    )
    story.append(Paragraph("ReliefRelay — Referral Packet", title_style))
    story.append(Spacer(1, 0.3 * cm))

    triage_style = ParagraphStyle(
        "Triage",
        fontSize=14,
        fontName="Helvetica-Bold",
        textColor=triage_color,
    )
    story.append(Paragraph(f"TRIAGE LEVEL: {triage_level}", triage_style))
    story.append(Paragraph(f"Case ID: {case_id}", styles["Normal"]))
    story.append(Paragraph(
        f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        styles["Normal"],
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0")))
    story.append(Spacer(1, 0.5 * cm))

    # ── Intake record table ────────────────────────────────────────────
    intake = case.get("intake_data", {})
    story.append(Paragraph("Intake Information", styles["Heading2"]))

    table_data = [
        ["Field", "Value"],
        ["Name", intake.get("name") or "Unknown"],
        ["Age", str(intake.get("age") or "Unknown")],
        ["Gender", intake.get("gender") or "Unknown"],
        ["Location Found", intake.get("location_found") or "Unknown"],
        ["Medical Urgency", intake.get("medical_urgency", "none").upper()],
        ["Family Members", str(intake.get("family_members", 1))],
        ["Language", intake.get("language_preference", "English")],
        ["Shelter Needed", "Yes" if intake.get("shelter_needed") else "No"],
        ["Food Needed", "Yes" if intake.get("food_needed") else "No"],
        ["Water Needed", "Yes" if intake.get("water_needed") else "No"],
        ["Medication", intake.get("medication_needed") or "None"],
        ["Special Needs", intake.get("special_needs") or "None"],
    ]

    issues = intake.get("presenting_issues", [])
    if issues:
        table_data.append(["Presenting Issues", ", ".join(issues)])

    t = Table(table_data, colWidths=[5 * cm, 12 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.5 * cm))

    # ── Action plan ────────────────────────────────────────────────────
    action_plan = case.get("action_plan")
    if action_plan:
        story.append(Paragraph("Action Plan", styles["Heading2"]))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0")))
        story.append(Spacer(1, 0.2 * cm))
        for line in action_plan.split("\n"):
            if line.strip():
                story.append(Paragraph(line, styles["Normal"]))
                story.append(Spacer(1, 0.1 * cm))
        story.append(Spacer(1, 0.5 * cm))

    # ── Missing information ────────────────────────────────────────────
    missing = intake.get("missing_information", [])
    if missing:
        story.append(Paragraph("Missing Information — Ask Next", styles["Heading2"]))
        for item in missing:
            story.append(Paragraph(f"• {item}", styles["Normal"]))
        story.append(Spacer(1, 0.5 * cm))

    # ── Footer ────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0")))
    footer_style = ParagraphStyle("Footer", fontSize=8, textColor=colors.HexColor("#94a3b8"))
    story.append(Paragraph(
        "Generated by ReliefRelay · Powered by Gemma 4 (local) · Offline-capable disaster relief intake system",
        footer_style,
    ))

    doc.build(story)
    return str(output_path)
