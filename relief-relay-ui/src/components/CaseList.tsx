import { useEffect, useState } from "react";
import { Inbox, Plus } from "lucide-react";
import type { Case } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CaseListProps {
  cases: Case[];
  activeCaseId: string | null;
  onSelectCase: (id: string) => void;
  onNewCase: () => void;
}

const TRIAGE_COLORS: Record<string, string> = {
  GREEN: "var(--triage-green)",
  YELLOW: "var(--triage-yellow)",
  ORANGE: "var(--triage-orange)",
  RED: "var(--triage-red)",
};

function getRelativeTime(timestamp: string) {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHrs < 24) return `${diffHrs} hr ago`;
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

export function CaseList({ cases, activeCaseId, onSelectCase, onNewCase }: CaseListProps) {
  // Use state to force re-render relative times every minute
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col h-full bg-bg-secondary">

      {/* HEADER */}
      <div className="sticky top-0 z-10 bg-bg-secondary border-b border-border flex items-center justify-between px-[16px] py-[12px]">
        <h2 className="text-[13px] font-semibold text-text-muted uppercase tracking-[0.08em]">
          Recent Cases
        </h2>
        <button
          onClick={onNewCase}
          className="flex items-center gap-[4px] text-[13px] font-medium text-accent hover:text-accent-light transition-colors"
        >
          <Plus size={14} /> New
        </button>
      </div>

      {/* LIST */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        {cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-[32px] text-center text-text-muted mt-[32px]">
            <Inbox size={32} className="mb-[12px] opacity-50" />
            <p className="text-[13px]">No cases yet.<br/>Start an intake above.</p>
          </div>
        ) : (
          cases.map((c) => {
            const isActive = c.case_id === activeCaseId;
            const color = TRIAGE_COLORS[c.triage_level] || "var(--text-muted)";

            return (
              <button
                key={c.case_id}
                onClick={() => onSelectCase(c.case_id)}
                className={cn(
                  "flex items-start text-left p-[16px] border-b border-border transition-colors hover:bg-bg-tertiary",
                  isActive ? "bg-bg-surface border-l-2" : "border-l-2 border-l-transparent"
                )}
                style={{
                  borderLeftColor: isActive ? "var(--accent)" : "transparent"
                }}
              >
                <div className="flex flex-col w-full gap-[6px]">

                  <div className="flex items-center gap-[8px]">
                    <span
                      className={cn(
                        "w-[8px] h-[8px] rounded-full shrink-0",
                        isActive && c.triage_level === "RED" ? "animate-pulse" : ""
                      )}
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-mono text-[13px] font-medium text-text-primary">
                      {c.case_id}
                    </span>
                  </div>

                  <div className="pl-[16px] flex flex-col gap-[2px]">
                    <div className="flex items-center gap-[6px] text-[13px] text-text-secondary">
                      <span className="truncate max-w-[120px] font-medium">
                        {c.intake_data?.name || "Unknown"}
                      </span>
                      <span>·</span>
                      <span className="font-semibold" style={{ color }}>
                        {c.triage_level}
                      </span>
                    </div>

                    <span className="text-[12px] text-text-muted">
                      {getRelativeTime(c.created_at)}
                    </span>
                  </div>

                </div>
              </button>
            );
          })
        )}
      </div>

    </div>
  );
}
