"use client";

import { motion } from "framer-motion";
import type { Case } from "@/lib/types";

interface CaseActivityFeedProps {
  cases: Case[];
}

function makeEvents(cases: Case[]) {
  const base = cases.slice(0, 8).map((entry, index) => ({
    id: `${entry.case_id}-${index}`,
    text:
      index % 4 === 0
        ? `Case ${entry.case_id} updated`
        : index % 4 === 1
          ? "Shelter capacity reduced"
          : index % 4 === 2
            ? "Medical escalation triggered"
            : "Resource allocation completed",
    time: new Date(entry.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }));

  return base.length > 0
    ? base
    : [
        { id: "seed-1", text: "Awaiting incoming operations updates", time: "--:--" },
        { id: "seed-2", text: "Case activity feed will stream here", time: "--:--" },
      ];
}

export function CaseActivityFeed({ cases }: CaseActivityFeedProps) {
  const events = makeEvents(cases);

  return (
    <section className="glass-panel rounded-2xl p-4 sm:p-5">
      <div className="mb-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/70">Live feed</p>
        <h3 className="mt-1 text-base font-semibold text-white">Case activity stream</h3>
      </div>

      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {events.map((event, idx) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.06 }}
            className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2"
          >
            <p className="text-sm text-slate-200">{event.text}</p>
            <span className="shrink-0 text-[11px] font-mono text-slate-400">{event.time}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
