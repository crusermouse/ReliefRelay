"use client";

import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ChevronRight } from "lucide-react";
import type { Case, TriageLevel } from "@/lib/types";
import { useState, useEffect } from "react";

interface CaseListProps {
  cases: Case[];
  selectedCaseId: string | null;
  onSelect: (caseId: string) => void;
}

const BADGE_STYLES: Record<TriageLevel, string> = {
  RED:    "bg-red-500/20 text-red-400 border border-red-500/30",
  ORANGE: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  YELLOW: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  GREEN:  "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
};

const URGENCY_STRIP: Record<TriageLevel, string> = {
  RED:    "urgency-red",
  ORANGE: "urgency-orange",
  YELLOW: "urgency-yellow",
  GREEN:  "urgency-green",
};

const PULSE_COLOR: Record<TriageLevel, string> = {
  RED:    "bg-red-400",
  ORANGE: "bg-orange-400",
  YELLOW: "bg-amber-400",
  GREEN:  "bg-emerald-400",
};

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 || 12;
    const displayM = m < 10 ? `0${m}` : m;
    return `${displayH}:${displayM} ${ampm}`;
  } catch {
    return "";
  }
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function CaseList({ cases, selectedCaseId, onSelect }: CaseListProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center gap-2 bg-white/[0.01]">
        <Users className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-xs font-semibold text-gray-300">Active Cases</span>
        <AnimatePresence>
          {cases.length > 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="ml-auto text-[10px] font-mono bg-white/[0.05] text-gray-400 px-2 py-0.5 rounded-full border border-white/[0.06]"
            >
              {cases.length}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {cases.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-8 text-center space-y-3"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-400/20 flex items-center justify-center mx-auto">
              <Users className="w-5 h-5 text-cyan-300/60" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-300">No cases yet</p>
              <p className="text-[11px] text-gray-500 mt-1">Try a demo scenario or submit an intake form</p>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            {cases.map((c, idx) => {
              const isSelected = selectedCaseId === c.case_id;
              return (
                <motion.button
                  key={c.case_id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.2) }}
                  onClick={() => onSelect(c.case_id)}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`View case ${c.case_id}`}
                  className={clsx(
                    "w-full text-left px-4 py-3 transition-all duration-200 border-b border-white/[0.04] last:border-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300/50 focus-visible:ring-inset relative group",
                    URGENCY_STRIP[c.triage_level],
                    isSelected
                      ? "bg-blue-500/[0.08] border-l-blue-500/60"
                      : "hover:bg-white/[0.02]",
                  )}
                >
                  {/* Selected glow */}
                  {isSelected && (
                    <motion.div
                      layoutId="case-selected-glow"
                      className="absolute inset-0 bg-gradient-to-r from-blue-500/[0.08] to-transparent pointer-events-none"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}

                  <div className="flex items-center justify-between mb-1 relative">
                    <div className="flex items-center gap-1.5">
                      {/* Severity pulse */}
                      <span className={clsx(
                        "w-1.5 h-1.5 rounded-full flex-shrink-0",
                        PULSE_COLOR[c.triage_level],
                        c.triage_level === "RED" ? "animate-pulse" : "",
                      )} />
                      <span className="text-[10px] font-mono text-gray-400">{c.case_id}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={clsx("text-[9px] font-bold px-1.5 py-0.5 rounded", BADGE_STYLES[c.triage_level])}>
                        {c.triage_level}
                      </span>
                      <ChevronRight className={clsx(
                        "w-3 h-3 transition-all duration-200",
                        isSelected ? "text-blue-400 translate-x-0.5" : "text-gray-700 group-hover:text-gray-500",
                      )} />
                    </div>
                  </div>

                  <p className="text-xs text-gray-300 truncate pl-3">
                    {c.intake_data?.name ?? "Unknown"}{" "}
                    {c.intake_data?.age ? (
                      <span className="text-gray-600">· {c.intake_data.age}y</span>
                    ) : null}
                  </p>

                  <div className="flex items-center gap-2 mt-1 pl-3">
                    {mounted && (
                      <>
                        <p className="text-[9px] text-gray-700 font-mono">{formatDate(c.created_at)}</p>
                        <span className="text-gray-800">·</span>
                        <p className="text-[9px] text-gray-700 font-mono">{formatTime(c.created_at)}</p>
                      </>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
