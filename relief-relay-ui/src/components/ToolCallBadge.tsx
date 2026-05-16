"use client"

import { motion } from "framer-motion"
import { Cpu, ChevronDown } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

const TOOL_DESCRIPTIONS: Record<string, string> = {
  create_case: "Saved intake record to local case database",
  search_local_resources: "Searched directory for nearby shelters and services",
  score_triage: "Computed priority score from urgency and needs",
  generate_referral_pdf: "Generated printable referral packet",
}

interface Props {
  toolsUsed: string[]
}

export function ToolCallBadge({ toolsUsed }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (!toolsUsed || toolsUsed.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.25 }}
      className="rounded-xl border border-white/8 bg-white/3 overflow-hidden"
    >
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded(v => !v)}
        className={cn(
          "w-full flex items-center gap-2.5 px-4 py-3",
          "text-left transition-colors duration-150",
          "hover:bg-white/5",
        )}
      >
        <Cpu size={13} className="text-violet-400 flex-shrink-0" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
          Gemma called {toolsUsed.length} tool{toolsUsed.length !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {toolsUsed.map(t => (
            <span
              key={t}
              className="text-[10px] font-mono px-2 py-0.5 rounded-md
                         bg-violet-500/15 text-violet-300 border border-violet-500/20"
            >
              {t}
            </span>
          ))}
          <ChevronDown
            size={12}
            className={cn(
              "text-white/30 transition-transform duration-200 ml-1",
              expanded && "rotate-180",
            )}
          />
        </div>
      </button>

      {/* Expanded descriptions */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="border-t border-white/6 px-4 pb-3 pt-2 space-y-2"
        >
          {toolsUsed.map((tool, i) => (
            <div key={tool} className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400/60 mt-1.5 flex-shrink-0" />
              <div>
                <span className="text-[11px] font-mono text-violet-300">{tool}</span>
                <p className="text-[12px] text-white/40 mt-0.5">
                  {TOOL_DESCRIPTIONS[tool] ?? "Executed successfully"}
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}
