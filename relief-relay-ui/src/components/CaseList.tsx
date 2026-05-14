"use client";

import clsx from "clsx";
import { Users } from "lucide-react";
import type { Case, TriageLevel } from "@/lib/types";

interface CaseListProps {
  cases: Case[];
  selectedCaseId: string | null;
  onSelect: (caseId: string) => void;
}

const BADGE_STYLES: Record<TriageLevel, string> = {
  RED: "bg-red-500/20 text-red-400 border border-red-500/30",
  ORANGE: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  YELLOW: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  GREEN: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
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

export function CaseList({ cases, selectedCaseId, onSelect }: CaseListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/[0.07] flex items-center gap-2">
        <Users className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-300">Cases</span>
        {cases.length > 0 && (
          <span className="ml-auto text-xs bg-white/[0.06] text-gray-400 px-2 py-0.5 rounded-full">
            {cases.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {cases.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-gray-600">No cases yet</p>
            <p className="text-xs text-gray-700 mt-1">Submit an intake to get started</p>
          </div>
        ) : (
          cases.map((c) => (
            <button
              key={c.case_id}
              onClick={() => onSelect(c.case_id)}
              type="button"
              aria-pressed={selectedCaseId === c.case_id}
              aria-label={`View case ${c.case_id}`}
              className={clsx(
                "w-full text-left px-4 py-3 hover:bg-white/[0.03] transition-colors border-b border-white/[0.04] last:border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70",
                selectedCaseId === c.case_id && "bg-blue-500/5",
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-gray-400">{c.case_id}</span>
                <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded", BADGE_STYLES[c.triage_level])}>
                  {c.triage_level}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate">
                {c.intake_data?.name ?? "Unknown"}{" "}
                {c.intake_data?.age ? `· ${c.intake_data.age}y` : ""}
              </p>
              <p className="text-[10px] text-gray-700 mt-0.5">
                {formatTime(c.created_at)}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
