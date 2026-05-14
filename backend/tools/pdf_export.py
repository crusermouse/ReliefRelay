import json
import re
import html
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

# Allowed case ID format: CASE- followed by 6 uppercase hex characters
_CASE_ID_RE = re.compile(r"^CASE-[0-9A-F]{6}$")
_INVALID_TEXT_RE = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F]")


def _validate_case_id(case_id: str) -> str:
    """Validate that case_id matches the expected safe pattern."""
    if not _CASE_ID_RE.match(case_id):
        raise ValueError(f"Invalid case_id format: {case_id!r}")
    return case_id


def _safe_text(value, default: str = "") -> str:
    """Convert arbitrary values to safe plain text for ReportLab Paragraph."""
    if value is None:
        raw = default
    elif isinstance(value, (list, tuple, set)):
        raw = ", ".join(str(v) for v in value if v is not None)
    elif isinstance(value, dict):
        raw = json.dumps(value, ensure_ascii=False)
    else:
        raw = str(value)

    if not raw.strip():
        raw = default

    raw = _INVALID_TEXT_RE.sub(" ", raw)
    return html.escape(raw, quote=True)

TRIAGE_COLORS = {
    "RED": colors.HexColor("#ef4444"),
    "ORANGE": colors.HexColor("#f97316"),
    "YELLOW": colors.HexColor("#f59e0b"),
    "GREEN": colors.HexColor("#22c55e"),
}


def generate_pdf(case_id: str) -> str:
    """Generate a printable referral PDF for the given case_id."""
    case_id = _validate_case_id(case_id)
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
    triage_level = str(case.get("triage_level", "GREEN")).upper()
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
    story.append(Paragraph(f"TRIAGE LEVEL: {_safe_text(triage_level, 'GREEN')}", triage_style))
    story.append(Paragraph(f"Case ID: {_safe_text(case_id)}", styles["Normal"]))
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
        ["Name", _safe_text(intake.get("name"), "Unknown")],
        ["Age", _safe_text(intake.get("age"), "Unknown")],
        ["Gender", _safe_text(intake.get("gender"), "Unknown")],
        ["Location Found", _safe_text(intake.get("location_found"), "Unknown")],
        ["Medical Urgency", _safe_text(str(intake.get("medical_urgency", "none")).upper(), "NONE")],
        ["Family Members", _safe_text(intake.get("family_members", 1), "1")],
        ["Language", _safe_text(intake.get("language_preference", "English"), "English")],
        ["Shelter Needed", "Yes" if intake.get("shelter_needed") else "No"],
        ["Food Needed", "Yes" if intake.get("food_needed") else "No"],
        ["Water Needed", "Yes" if intake.get("water_needed") else "No"],
        ["Medication", _safe_text(intake.get("medication_needed"), "None")],
        ["Special Needs", _safe_text(intake.get("special_needs"), "None")],
    ]

    issues = intake.get("presenting_issues", [])
    if issues:
        table_data.append(["Presenting Issues", _safe_text(issues, "None")])

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
        for line in str(action_plan).splitlines():
            if line.strip():
                story.append(Paragraph(_safe_text(line), styles["Normal"]))
                story.append(Spacer(1, 0.1 * cm))
        story.append(Spacer(1, 0.5 * cm))

    # ── Missing information ────────────────────────────────────────────
    missing = intake.get("missing_information", [])
    if missing:
        story.append(Paragraph("Missing Information — Ask Next", styles["Heading2"]))
        for item in missing:
            item_text = _safe_text(item)
            if item_text.strip():
                story.append(Paragraph(f"• {item_text}", styles["Normal"]))
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
