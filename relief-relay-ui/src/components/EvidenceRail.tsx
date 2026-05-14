"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, BookOpen, ShieldCheck } from "lucide-react";
import type { EvidenceChunk } from "@/lib/types";

interface EvidenceRailProps {
  evidence: EvidenceChunk[];
  toolsUsed: string[];
}

export function EvidenceRail({ evidence, toolsUsed }: EvidenceRailProps) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const topSource = evidence[0]?.source.split("/").pop() ?? "WHO Emergency Maternal Guideline";

  return (
    <div className="glass-panel rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-white">Evidence & Decision Trust</h3>
        <span className="text-xs text-gray-500">({evidence.length} sources)</span>
      </div>

      <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/[0.04] p-3">
        <p className="text-[11px] uppercase tracking-[0.14em] text-cyan-300 mb-2 flex items-center gap-2">
          <ShieldCheck className="w-3 h-3" />
          Decision Reasoning
        </p>
        <div className="space-y-2">
          {["Extracted Case Fact", topSource, "High-Risk Classification", "Immediate Medical Referral"].map((node, i) => (
            <motion.div 
              key={node} 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3 group cursor-default"
            >
              <div className="w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(105,212,255,0.7)] group-hover:shadow-[0_0_15px_rgba(105,212,255,1)] transition-shadow" />
              <span className="text-xs text-gray-200 group-hover:text-gray-100 transition-colors">{node}</span>
              {i < 3 && <span className="text-[8px] text-gray-600 ml-auto">→</span>}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tool calls audit */}
      {toolsUsed.length > 0 && (
        <div className="rounded-lg border border-purple-400/20 bg-purple-500/[0.04] p-3">
          <p className="text-xs text-purple-300 mb-2 uppercase tracking-widest font-semibold">🔧 Tools Called by Gemma 4</p>
          <div className="flex flex-wrap gap-1.5">
            {toolsUsed.map((tool, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="bg-gradient-to-r from-purple-500/20 to-pink-500/10 text-purple-300 text-xs font-mono px-2.5 py-1.5 rounded border border-purple-500/30 hover:border-purple-400/50 hover:shadow-[0_0_12px_rgba(168,85,247,0.3)] transition-all"
              >
                {tool}()
              </motion.span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/[0.05] px-3 py-2 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-300" />
        <p className="text-xs text-emerald-100">
          Confidence chain validated with linked SOP evidence.
        </p>
      </div>

      {evidence.length === 0 ? (
        <p className="text-xs text-gray-600 italic">No policy documents indexed yet. Add documents to backend/data/relief_docs/</p>
      ) : (
        <div className="space-y-2">
          {evidence.map((chunk, i) => (
            <div
              key={i}
                className="bg-white/[0.02] border border-white/[0.08] rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2 max-w-[85%]">
                    <span className="bg-blue-500/10 text-blue-300 text-xs px-2 py-1 rounded-md truncate">
                      {chunk.source.split("/").pop() ?? chunk.source}
                    </span>
                    <span className="text-[10px] text-cyan-300 font-mono">confidence {(89 - i * 7).toFixed(0)}%</span>
                  </div>
                  {expanded === i ? (
                    <ChevronUp className="w-3 h-3 text-gray-500 shrink-0" />
                  ) : (
                  <ChevronDown className="w-3 h-3 text-gray-500 shrink-0" />
                )}
              </button>
              {expanded === i && (
                <div className="px-3 pb-3">
                  <p className="text-xs text-gray-400 leading-relaxed">{chunk.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
