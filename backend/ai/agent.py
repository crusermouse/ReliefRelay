import json
import ollama
from config import settings
from tools.resource_lookup import search_resources
from tools.case_manager import create_case_db
from tools.pdf_export import generate_pdf

# ── TOOL SCHEMAS (Ollama-compatible format) ────────────────────────────
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_local_resources",
            "description": "Search local directory for shelters, food, medical, or transport resources near a location.",
            "parameters": {
                "type": "object",
                "properties": {
                    "resource_type": {
                        "type": "string",
                        "enum": ["shelter", "food", "medical", "transport"],
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


# ── TOOL EXECUTOR ──────────────────────────────────────────────────────
def execute_tool(tool_name: str, tool_args: dict) -> str:
    """Route tool calls from Gemma 4 to the actual Python functions."""
    if tool_name == "search_local_resources":
        results = search_resources(**tool_args)
        return json.dumps(results)
    elif tool_name == "create_case":
        case_id = create_case_db(**tool_args)
        return json.dumps({"case_id": case_id, "status": "created"})
    else:
        return json.dumps({"error": f"Unknown tool: {tool_name}"})


# ── MAIN AGENT LOOP ────────────────────────────────────────────────────
async def run_intake_agent(intake_record: dict, rag_context: str) -> dict:
    """
    Two-pass Gemma 4 agent loop:
    Pass 1: Model receives intake + context, decides which tools to call
    Pass 2: Tool results returned, model generates final action plan

    Returns: { case_id, triage_level, action_plan, resources, evidence }
    """
    system = """You are a disaster relief intake agent.
You receive a structured intake record and policy context.
Your job is to:
1. Determine triage level (GREEN/YELLOW/ORANGE/RED)
2. Call search_local_resources for each needed resource type
3. Call create_case to save the record with the triage level
4. Generate a clear action plan for the relief volunteer

Always use tools when appropriate. Be decisive and brief."""

    user_message = f"""INTAKE RECORD:
{json.dumps(intake_record, indent=2)}

POLICY CONTEXT:
{rag_context}

Process this case now."""

    messages = [{"role": "user", "content": user_message}]

    # ── PASS 1: Let Gemma 4 decide what tools to call ──────────────────
    response = ollama.chat(
        model=settings.GEMMA_MODEL,
        messages=[{"role": "system", "content": system}] + messages,
        tools=TOOLS,
        options={"temperature": 1.0},
    )
    assistant_message = response["message"]
    messages.append(assistant_message)

    # ── Execute each tool call Gemma requested ─────────────────────────
    tool_results: dict = {}
    tool_calls_raw = assistant_message.get("tool_calls") or []
    for tool_call in tool_calls_raw:
        fn_name = tool_call["function"]["name"]
        fn_args = tool_call["function"]["arguments"]
        if isinstance(fn_args, str):
            fn_args = json.loads(fn_args)
        result = execute_tool(fn_name, fn_args)
        tool_results[fn_name] = json.loads(result)
        messages.append({
            "role": "tool",
            "content": result,
        })

    # ── PASS 2: Final synthesis with tool results ──────────────────────
    final_response = ollama.chat(
        model=settings.GEMMA_MODEL,
        messages=[{"role": "system", "content": system}] + messages,
        options={"temperature": 1.0},
    )
    action_plan = final_response["message"]["content"]

    return {
        "case_id": tool_results.get("create_case", {}).get("case_id"),
        "action_plan": action_plan,
        "resources_found": tool_results.get("search_local_resources", {}),
        "tool_calls_made": list(tool_results.keys()),  # For transparency UI
    }
