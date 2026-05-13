"use client";

import { motion } from "framer-motion";
import type { Case } from "@/lib/types";

interface CrisisOperationsMapProps {
  cases: Case[];
}

const STATIC_NODES = [
  { id: "shelter-1", label: "Shelter A", type: "shelter", x: 22, y: 26 },
  { id: "shelter-2", label: "Shelter C", type: "shelter", x: 64, y: 70 },
  { id: "supply", label: "Supply Hub", type: "supply", x: 44, y: 54 },
  { id: "risk", label: "Flood risk zone", type: "risk", x: 74, y: 32 },
];

function severityTone(level: string) {
  if (level === "RED") return "bg-rose-400";
  if (level === "ORANGE") return "bg-amber-400";
  if (level === "YELLOW") return "bg-yellow-300";
  return "bg-emerald-300";
}

export function CrisisOperationsMap({ cases }: CrisisOperationsMapProps) {
  const plottedCases = cases.slice(0, 7).map((entry, idx) => ({
    id: entry.case_id,
    triage: entry.triage_level,
    x: 15 + ((idx * 13) % 70),
    y: 18 + ((idx * 19) % 64),
  }));

  return (
    <section className="glass-panel rounded-2xl p-4 sm:p-5">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/70">Crisis map</p>
          <h3 className="mt-1 text-base font-semibold text-white">Operational heat zone</h3>
        </div>
        <p className="text-xs text-slate-300/70">Simulated live view</p>
      </div>

      <div className="soft-grid relative h-64 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-slate-950/80 to-slate-900/40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(79,146,255,0.2),transparent_38%),radial-gradient(circle_at_80%_15%,rgba(244,180,72,0.16),transparent_35%),radial-gradient(circle_at_70%_70%,rgba(255,99,120,0.15),transparent_30%)]" />

        {STATIC_NODES.map((node) => (
          <div key={node.id} className="absolute" style={{ left: `${node.x}%`, top: `${node.y}%` }}>
            <div className="pulse-halo absolute -inset-2 rounded-full bg-cyan-400/20" />
            <div className="relative rounded-full border border-cyan-200/40 bg-cyan-300/20 px-2 py-0.5 text-[10px] text-cyan-100">
              {node.label}
            </div>
          </div>
        ))}

        {plottedCases.map((entry, idx) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.08 }}
            className="absolute"
            style={{ left: `${entry.x}%`, top: `${entry.y}%` }}
          >
            <span className={`absolute -inset-2 rounded-full ${severityTone(entry.triage)} opacity-20 pulse-halo`} />
            <span className={`relative block h-2.5 w-2.5 rounded-full ${severityTone(entry.triage)} shadow-[0_0_14px_currentColor]`} />
          </motion.div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300/75 sm:grid-cols-4">
        <p>Active cases: {cases.length}</p>
        <p>Risk zones: 3</p>
        <p>Shelters tracked: 2</p>
        <p>Supply shortages: 1</p>
      </div>
    </section>
  );
}
