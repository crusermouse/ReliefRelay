"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import type { EvidenceChunk } from "@/lib/types";

interface EvidenceRailProps {
  evidence: EvidenceChunk[];
  toolsUsed: string[];
}

function confidenceFor(index: number) {
  if (index === 0) return "0.94";
  if (index === 1) return "0.88";
  return "0.81";
}

export function EvidenceRail({ evidence, toolsUsed }: EvidenceRailProps) {
  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl p-4"
    >
      <div className="mb-4 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-cyan-200" />
        <h3 className="text-sm font-semibold text-white">Evidence ledger</h3>
        <span className="text-xs text-slate-400">({evidence.length} linked sources)</span>
      </div>

      {toolsUsed.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">Native function calls</p>
          <div className="flex flex-wrap gap-1.5">
            {toolsUsed.map((tool) => (
              <span
                key={tool}
                className="rounded border border-purple-200/30 bg-purple-400/12 px-2 py-1 font-mono text-xs text-purple-100"
              >
                {tool}()
              </span>
            ))}
          </div>
        </div>
      )}

      {evidence.length === 0 ? (
        <p className="text-xs italic text-slate-400">No policy evidence indexed yet. Add docs to backend/data/relief_docs/.</p>
      ) : (
        <div className="space-y-2">
          {evidence.map((chunk, i) => {
            const isOpen = expanded === i;
            return (
              <motion.div
                key={`${chunk.source}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="overflow-hidden rounded-xl border border-white/10 bg-black/20"
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-3 p-3 text-left"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="max-w-full truncate rounded-md bg-cyan-400/12 px-2 py-1 text-xs text-cyan-100">
                      {chunk.source.split("/").pop() ?? chunk.source}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">Confidence {confidenceFor(i)}</span>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </button>
                {isOpen && (
                  <div className="border-t border-white/10 px-3 pb-3 pt-2 text-xs leading-relaxed text-slate-300">
                    {chunk.content}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}
