import json
import re
import html
from functools import lru_cache
from pathlib import Path
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from tools.case_manager import get_case

OUTPUT_DIR = Path("/tmp/reliefRelay_pdfs")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Allowed case ID format: CASE- followed by 6 uppercase hex characters
_CASE_ID_RE = re.compile(r"^CASE-[0-9A-F]{6}$")
_INVALID_TEXT_RE = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F]")


_REGISTERED_FONTS = set()


@lru_cache(maxsize=1)
def _register_fonts() -> tuple[str, str]:
    """Prefer a Unicode-capable font, but fall back safely if unavailable."""
    candidates = [
        ("DejaVuSans", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        ("LiberationSans", "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"),
    ]
    bold_candidates = [
        ("DejaVuSans-Bold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        ("LiberationSans-Bold", "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf"),
    ]

    body_font = "Helvetica"
    bold_font = "Helvetica-Bold"
    for font_name, font_path in candidates:
        if font_name in _REGISTERED_FONTS:
            body_font = font_name
            break
        if Path(font_path).exists():
            try:
                pdfmetrics.registerFont(TTFont(font_name, font_path))
                _REGISTERED_FONTS.add(font_name)
                body_font = font_name
                break
            except Exception:
                continue

    for font_name, font_path in bold_candidates:
        if font_name in _REGISTERED_FONTS:
            bold_font = font_name
            break
        if Path(font_path).exists():
            try:
                pdfmetrics.registerFont(TTFont(font_name, font_path))
                _REGISTERED_FONTS.add(font_name)
                bold_font = font_name
                break
            except Exception:
                continue

    return body_font, bold_font


def _validate_case_id(case_id: str) -> str:
    """Validate that case_id matches the expected safe pattern."""
    if not _CASE_ID_RE.match(case_id):
        raise ValueError(f"Invalid case_id format: {case_id!r}")
    return case_id


def _truncate_text(text: str, limit: int = 1800) -> str:
    if len(text) <= limit:
        return text
    return text[: max(0, limit - 1)].rstrip() + "…"


def _safe_text(value, default: str = "", limit: int = 1800) -> str:
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
    return html.escape(_truncate_text(raw, limit=limit), quote=True)


def _append_paragraph(story: list, text: str, style, limit: int = 1800) -> None:
    safe_text = _safe_text(text, limit=limit)
    try:
        story.append(Paragraph(safe_text, style))
    except Exception:
        story.append(Paragraph(_safe_text("Content unavailable due to formatting limits."), style))


def _append_line_block(story: list, title: str, body: str, style, max_chars: int = 1800) -> None:
    story.append(Paragraph(title, style))
    for line in str(body).splitlines():
        if line.strip():
            _append_paragraph(story, line, style, limit=max_chars)
            story.append(Spacer(1, 0.08 * cm))

TRIAGE_COLORS = {
    "RED": colors.HexColor("#ef4444"),
    "ORANGE": colors.HexColor("#f97316"),
    "YELLOW": colors.HexColor("#f59e0b"),
    "GREEN": colors.HexColor("#22c55e"),
}


def generate_pdf(case_id: str, case_data: dict = None) -> str:
    """Generate a printable referral PDF for the given case_id."""
    case_id = _validate_case_id(case_id)
    if case_data is None:
        case = get_case(case_id)
        if not case:
            raise ValueError(f"Case {case_id} not found")
    else:
        case = case_data

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
    body_font, bold_font = _register_fonts()
    styles["Normal"].fontName = body_font
    styles["Heading2"].fontName = bold_font
    story = []

    # ── Header ────────────────────────────────────────────────────────
    triage_level = str(case.get("triage_level", "GREEN")).upper()
    triage_level_text = _safe_text(triage_level, "GREEN")
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
        fontName=bold_font,
        textColor=triage_color,
    )
    story.append(Paragraph(f"TRIAGE LEVEL: {triage_level_text}", triage_style))
    story.append(Paragraph(f"Case ID: {_safe_text(case_id, limit=64)}", styles["Normal"]))
    story.append(Paragraph(
        f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        styles["Normal"],
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0")))
    story.append(Spacer(1, 0.5 * cm))

    # ── Intake record table ────────────────────────────────────────────
    intake = case.get("intake_data", {})
    story.append(Paragraph("Intake Information", styles["Heading2"]))

    medical_urgency = str(intake.get("medical_urgency", "none")).upper()

    table_data = [
        ["Field", "Value"],
        ["Name", _safe_text(intake.get("name"), "Unknown", 240)],
        ["Age", _safe_text(intake.get("age"), "Unknown", 64)],
        ["Gender", _safe_text(intake.get("gender"), "Unknown", 128)],
        ["Location Found", _safe_text(intake.get("location_found"), "Unknown", 240)],
        ["Medical Urgency", _safe_text(medical_urgency, "NONE", 64)],
        ["Family Members", _safe_text(intake.get("family_members", 1), "1", 64)],
        ["Language", _safe_text(intake.get("language_preference", "English"), "English", 128)],
        ["Shelter Needed", "Yes" if intake.get("shelter_needed") else "No"],
        ["Food Needed", "Yes" if intake.get("food_needed") else "No"],
        ["Water Needed", "Yes" if intake.get("water_needed") else "No"],
        ["Medication", _safe_text(intake.get("medication_needed"), "None", 240)],
        ["Special Needs", _safe_text(intake.get("special_needs"), "None", 240)],
    ]

    issues = intake.get("presenting_issues", [])
    if issues:
        table_data.append(["Presenting Issues", _safe_text(issues, "None", 260)])

    t = Table(table_data, colWidths=[5 * cm, 12 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), bold_font),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("FONTNAME", (0, 1), (0, -1), bold_font),
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
                _append_paragraph(story, line, styles["Normal"], limit=1200)
                story.append(Spacer(1, 0.1 * cm))
        story.append(Spacer(1, 0.5 * cm))

    # ── Missing information ────────────────────────────────────────────
    missing = intake.get("missing_information", [])
    if missing:
        story.append(Paragraph("Missing Information — Ask Next", styles["Heading2"]))
        for item in missing:
            item_text = _safe_text(item, limit=240)
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

    try:
        doc.build(story)
    except Exception:
        fallback_story = [
            Paragraph("ReliefRelay — Referral Packet", title_style),
            Spacer(1, 0.3 * cm),
            Paragraph(f"Case ID: {_safe_text(case_id, limit=64)}", styles["Normal"]),
            Paragraph(f"TRIAGE LEVEL: {_safe_text(triage_level, 'GREEN', 24)}", triage_style),
            Spacer(1, 0.4 * cm),
            Paragraph("Action Plan", styles["Heading2"]),
            Paragraph(_safe_text(action_plan or "No action plan available.", limit=1800), styles["Normal"]),
        ]
        doc.build(fallback_story)
    return str(output_path)
