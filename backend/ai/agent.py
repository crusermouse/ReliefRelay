import json
from typing import Any

from config import settings
from ai.gemma import chat_with_tools, chat_text
from ai.triage import score_triage
from tools.case_manager import create_case_db, update_case_db
from tools.resource_lookup import search_resources

# ── TOOL SCHEMAS (Ollama-compatible format) ────────────────────────────
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_local_resources",
            "description": "Search local directory for shelters, food, medical, transport, or escalation resources near a location.",
            "parameters": {
                "type": "object",
                "properties": {
                    "resource_type": {
                        "type": "string",
                        "enum": ["shelter", "food", "medical", "transport", "escalation"],
                        "description": "Type of resource needed",
                    },
                    "location": {
                        "type": "string",
                        "description": "Area or neighborhood to search near",
                    },
                    "family_size": {
                        "type": "integer",
                        "description": "Number of people needing the resource",
                    },
                },
                "required": ["resource_type"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_case",
            "description": "Save a new intake case to the local database and return a case ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "intake_data": {"type": "object", "description": "The full extracted intake record"},
                    "triage_level": {"type": "string", "enum": ["GREEN", "YELLOW", "ORANGE", "RED"]},
                },
                "required": ["intake_data", "triage_level"],
            },
        },
    },
]

RESOURCE_PRIORITY = ["shelter", "food", "transport", "medical", "escalation"]


def _safe_tool_args(tool_args: Any) -> dict[str, Any]:
    if isinstance(tool_args, str):
        try:
            tool_args = json.loads(tool_args)
        except Exception:
            return {}
    return tool_args if isinstance(tool_args, dict) else {}


def _resource_types_for_case(intake_record: dict, triage_level: str) -> list[str]:
    needed: list[str] = []
    if intake_record.get("shelter_needed"):
        needed.append("shelter")
    if intake_record.get("food_needed"):
        needed.append("food")
    if intake_record.get("water_needed"):
        needed.append("transport")
    if str(intake_record.get("medical_urgency", "none")).lower() in {"medium", "high", "critical"}:
        needed.append("medical")
    if triage_level in {"RED", "ORANGE"}:
        needed.append("escalation")

    ordered: list[str] = []
    for resource_type in RESOURCE_PRIORITY:
        if resource_type in needed and resource_type not in ordered:
            ordered.append(resource_type)
    return ordered


def _append_resource_results(resources_found: dict[str, list[dict]], resource_type: str, results: Any) -> None:
    bucket = resources_found.setdefault(resource_type, [])
    if isinstance(results, list):
        for item in results:
            if isinstance(item, dict):
                bucket.append(item)
    elif isinstance(results, dict):
        bucket.append(results)


def _build_fallback_action_plan(
    intake_record: dict,
    rag_context: str,
    resources_found: dict[str, list[dict]],
    triage_level: str,
) -> str:
    lines = [
        f"TRIAGE SUMMARY: Local fallback mode generated this plan from intake data and available policy context. Triage level {triage_level}.",
        "IMMEDIATE ACTIONS:",
        "1. Confirm identity, location, and safety status.",
        "2. Address the highest medical or shelter need first.",
        "3. Escalate to a supervisor if symptoms worsen or the case is RED/ORANGE.",
        "4. Use the printed referral packet to coordinate next steps.",
        "RESOURCE NEEDS:",
    ]

    for resource_type in RESOURCE_PRIORITY:
        if resources_found.get(resource_type):
            lines.append(f"- {resource_type.title()}: {len(resources_found[resource_type])} local match(es) found.")

    if not any(resources_found.values()):
        lines.append("- No local resources were resolved automatically; review the local directory manually.")

    if rag_context.strip():
        lines.extend([
            "MISSING INFO:",
            "- Review the extracted fields against the retrieved SOP context before dispatching.",
            "ESCALATION:",
            f"- {'YES' if triage_level in {'RED', 'ORANGE'} else 'NO'}: fallback triage derived from medical urgency and intake flags.",
            "POLICY CITATIONS:",
            "- Retrieved local policy corpus was used for grounding.",
        ])

    if intake_record.get("presenting_issues"):
        lines.append(f"Presenting issues: {', '.join(str(v) for v in intake_record['presenting_issues'] if v)}")

    return "\n".join(lines)


def execute_tool(tool_name: str, tool_args: dict[str, Any]) -> dict[str, Any]:
    """Route tool calls from Gemma 4 to the actual Python functions."""
    try:
        if tool_name == "search_local_resources":
            resource_type = str(tool_args.get("resource_type", "")).strip().lower()
            results = search_resources(
                resource_type=resource_type,
                location=str(tool_args.get("location", "")),
                family_size=int(tool_args.get("family_size", 1) or 1),
            )
            return {"results": results, "resource_type": resource_type}

        if tool_name == "create_case":
            case_id = create_case_db(**tool_args)
            return {"case_id": case_id, "status": "created"}

        return {"error": f"Unknown tool: {tool_name}"}
    except Exception as exc:
        return {"error": f"{tool_name} failed: {exc}"}


# ── MAIN AGENT LOOP ────────────────────────────────────────────────────
async def run_intake_agent(intake_record: dict, rag_context: str) -> dict:
    """
    Two-pass Gemma 4 agent loop.

    Returns: { case_id, triage_level, action_plan, resources, evidence }
    """
    triage_level = score_triage(
        medical_urgency=str(intake_record.get("medical_urgency", "none")).lower(),
        shelter_needed=bool(intake_record.get("shelter_needed")),
        food_needed=bool(intake_record.get("food_needed")),
        water_needed=bool(intake_record.get("water_needed")),
        family_members=int(intake_record.get("family_members", 1)),
        special_needs=intake_record.get("special_needs"),
    )
    system = """You are a disaster relief intake agent.
You receive a structured intake record and policy context.
Your job is to:
1. Determine triage level (GREEN/YELLOW/ORANGE/RED)
2. Call search_local_resources for each needed resource type
3. Call create_case to save the record with the triage level
4. Generate a clear action plan for the relief volunteer

Always use tools when appropriate. Be decisive and brief."""

    user_message = f"""INTAKE RECORD:
{json.dumps(intake_record, indent=2, ensure_ascii=False)}

POLICY CONTEXT:
{rag_context}

Process this case now."""

    messages = [{"role": "user", "content": user_message}]
    tool_calls_raw: list[dict[str, Any]] = []
    assistant_message: dict[str, Any] = {"role": "assistant", "content": ""}

    assistant_message = await chat_with_tools(messages=[{"role": "system", "content": system}] + messages, tools=TOOLS, system=system)
    tool_calls_raw = assistant_message.get("tool_calls") or []
    if not isinstance(tool_calls_raw, list):
        tool_calls_raw = []
    messages.append(assistant_message)

    tool_results: dict[str, list[dict[str, Any]]] = {}
    tool_calls_made: list[str] = []
    case_id: str | None = None

    for tool_call in tool_calls_raw:
        function_block = tool_call.get("function", {}) if isinstance(tool_call, dict) else {}
        fn_name = str(function_block.get("name", "")).strip()
        fn_args = _safe_tool_args(function_block.get("arguments", {}))
        if fn_name == "create_case":
            fn_args.setdefault("intake_data", intake_record)
            fn_args.setdefault("triage_level", triage_level)

        result = execute_tool(fn_name, fn_args)
        tool_calls_made.append(fn_name)

        if fn_name == "search_local_resources":
            resource_type = str(fn_args.get("resource_type", "")).strip().lower() or "unknown"
            _append_resource_results(tool_results, resource_type, result.get("results", []))
        elif fn_name == "create_case" and result.get("case_id"):
            case_id = str(result["case_id"])
            tool_results.setdefault("create_case", []).append(result)

        messages.append({
            "role": "tool",
            "name": fn_name,
            "content": json.dumps(result, ensure_ascii=False),
        })

    for resource_type in _resource_types_for_case(intake_record, triage_level):
        if resource_type not in tool_results:
            fallback = execute_tool(
                "search_local_resources",
                {
                    "resource_type": resource_type,
                    "location": intake_record.get("location_found", ""),
                    "family_size": intake_record.get("family_members", 1),
                },
            )
            _append_resource_results(tool_results, resource_type, fallback.get("results", []))

    if not case_id:
        case_id = create_case_db(intake_data=intake_record, triage_level=triage_level)

    workflow_events = [
        {"stage": "extraction", "status": "complete"},
        {"stage": "retrieval", "status": "complete"},
        {"stage": "tool-calling", "status": "complete" if tool_calls_raw else "degraded"},
    ]

    temp = 0.0 if settings.GEMMA_DETERMINISTIC else 1.0
    final_message = await chat_text(prompt=f"Generate an action plan:\n\n{json.dumps(intake_record, ensure_ascii=False)}\n\nContext:\n{rag_context}", system=system, temperature=temp)
    action_plan = str(final_message).strip()
    if not action_plan:
        raise ValueError("Empty action plan returned by model")
    workflow_events.append({"stage": "packet-generation", "status": "complete"})

    try:
        update_case_db(case_id, action_plan)
        workflow_events.append({"stage": "persistence", "status": "complete"})
    except Exception:
        workflow_events.append({"stage": "persistence", "status": "failed"})

    return {
        "case_id": case_id,
        "action_plan": action_plan,
        "resources_found": tool_results,
        "tool_calls_made": tool_calls_made,
        "workflow_events": workflow_events,
        "operational_mode": "full",
        "triage_level": triage_level,
    }