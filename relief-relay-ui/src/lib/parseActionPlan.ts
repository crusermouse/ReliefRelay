/**
 * parseActionPlan.ts
 * Converts the raw Gemma action plan string into a structured array
 * of typed, renderable step objects.
 */

export type StepCategory =
  | "triage"       // Triage level declaration
  | "action"       // Concrete volunteer action
  | "assessment"   // Re-engage / verify / assess instruction
  | "warning"      // Escalation or urgent flag
  | "info"         // General information

export interface ActionStep {
  id: string
  category: StepCategory
  title: string       // Bold label (e.g. "Re-engage for Information")
  body: string        // The descriptive sentence after the label
  raw: string         // Original line for debugging
}

// Lines that match these patterns are tool call artifacts — hide them entirely
const TOOL_CALL_PATTERNS = [
  /^`?create_case\(/,
  /^`?search_local_resources\(/,
  /^`?score_triage\(/,
  /^`?generate_referral_pdf\(/,
  /^\*\*Tool Calls:\*\*/i,
  /^Tool Calls:/i,
  /^"triage_level":/,
  /^\{.*"name".*"age".*\}/,
]

// Map keywords in the title to a category
const CATEGORY_MAP: Array<[RegExp, StepCategory]> = [
  [/triage level/i,         "triage"],
  [/escalat/i,              "warning"],
  [/urgent/i,               "warning"],
  [/critical/i,             "warning"],
  [/re.?engage|follow.?up/i,"assessment"],
  [/verify|confirm|assess/i,"assessment"],
  [/comprehensive|needs/i,  "assessment"],
  [/update|record/i,        "info"],
]

function categorize(title: string): StepCategory {
  for (const [pattern, cat] of CATEGORY_MAP) {
    if (pattern.test(title)) return cat
  }
  return "action"
}

/** Strip **markdown** bold markers and backtick code spans */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")  // **bold** → bold
    .replace(/`([^`]+)`/g, "$1")       // `code` → code
    .replace(/\*(.*?)\*/g, "$1")       // *italic* → italic
    .trim()
}

/** Split "Title: body sentence" into [title, body] */
function splitTitleBody(clean: string): [string, string] {
  const colonIdx = clean.indexOf(":")
  if (colonIdx === -1) return ["", clean]
  const title = clean.slice(0, colonIdx).trim()
  const body = clean.slice(colonIdx + 1).trim()
  return [title, body]
}

export function parseActionPlan(raw: string): ActionStep[] {
  if (!raw) return []

  const lines = raw
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean)

  const steps: ActionStep[] = []

  for (const line of lines) {
    // Remove leading numbered list markers: "1.", "1)", "- ", "• "
    const stripped = line.replace(/^[\d]+[.)]\s*/, "").replace(/^[-•]\s*/, "")

    // Skip tool call artifacts entirely
    if (TOOL_CALL_PATTERNS.some(p => p.test(stripped))) continue

    // Skip very short lines that are just headers
    if (stripped.length < 8) continue

    const clean = stripMarkdown(stripped)
    const [title, body] = splitTitleBody(clean)

    // If no colon split, treat the whole thing as a body with no title
    const finalTitle = title || ""
    const finalBody = body || clean

    steps.push({
      id: `step-${steps.length}`,
      category: categorize(finalTitle || finalBody),
      title: finalTitle,
      body: finalBody,
      raw: line,
    })
  }

  return steps
}
