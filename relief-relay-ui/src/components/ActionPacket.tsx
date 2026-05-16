"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Copy, FileDown, Check, ClipboardList } from "lucide-react"
import { ActionStep } from "@/components/ActionStep"
import { ToolCallBadge } from "@/components/ToolCallBadge"
import { parseActionPlan } from "@/lib/parseActionPlan"
import { getPdfUrl } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Props {
  actionPlan: string
  caseId: string | null
  toolsUsed: string[]
}

export function ActionPacket({ actionPlan, caseId, toolsUsed }: Props) {
  const [copied, setCopied] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const steps = parseActionPlan(actionPlan)

  const handleCopy = async () => {
    // Copy plain-text version (strip any remaining markdown)
    const plain = steps.map((s, i) =>
      `${i + 1}. ${s.title ? s.title + ": " : ""}${s.body}`
    ).join("\n")
    await navigator.clipboard.writeText(plain)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExport = () => {
    if (!caseId) return
    setPdfLoading(true)
    const url = getPdfUrl(caseId)
    window.open(url, "_blank")
    setTimeout(() => setPdfLoading(false), 2000)
  }

  if (!actionPlan && steps.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-white/8 bg-[#111318] overflow-hidden"
    >
      {/* ── HEADER ── */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/6">
        <ClipboardList size={15} className="text-white/40" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
          Action Plan
        </span>

        <div className="ml-auto flex items-center gap-2">
          {/* Copy button */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleCopy}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
              "border transition-all duration-200",
              copied
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-white/10 bg-white/5 text-white/50 hover:text-white/80 hover:bg-white/8",
            )}
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  className="flex items-center gap-1"
                >
                  <Check size={11} /> Copied
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  className="flex items-center gap-1"
                >
                  <Copy size={11} /> Copy
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Export PDF button */}
          {caseId && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleExport}
              disabled={pdfLoading}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                "border border-white/10 bg-white/5 text-white/50",
                "hover:text-white/80 hover:bg-white/8",
                "transition-all duration-200 disabled:opacity-40",
              )}
            >
              <FileDown size={11} />
              {pdfLoading ? "Opening…" : "Export PDF"}
            </motion.button>
          )}
        </div>
      </div>

      {/* ── TOOL CALLS ── */}
      {toolsUsed?.length > 0 && (
        <div className="px-4 pt-4">
          <ToolCallBadge toolsUsed={toolsUsed} />
        </div>
      )}

      {/* ── ACTION STEPS ── */}
      <div className="p-4 space-y-2.5">
        {steps.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-8">
            No action steps generated yet.
          </p>
        ) : (
          steps.map((step, i) => (
            <ActionStep key={step.id} step={step} index={i} />
          ))
        )}
      </div>

      {/* ── CASE ID FOOTER ── */}
      {caseId && (
        <div className="px-5 py-3 border-t border-white/6 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-white/30">Case saved</span>
          <span className="text-[11px] font-mono text-white/50 ml-1">{caseId}</span>
        </div>
      )}
    </motion.div>
  )
}
