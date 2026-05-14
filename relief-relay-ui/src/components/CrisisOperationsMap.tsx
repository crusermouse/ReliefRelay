"use client";

import { useReducedMotion } from "framer-motion";
import { motion } from "framer-motion";

const MARKERS = [
  { id: "a1", x: "21%", y: "38%", type: "high", label: "Active case cluster" },
  { id: "a2", x: "33%", y: "54%", type: "medium", label: "Supply shortage" },
  { id: "a3", x: "61%", y: "48%", type: "critical", label: "Medical escalation" },
  { id: "a4", x: "75%", y: "34%", type: "low", label: "Shelter available" },
  { id: "a5", x: "54%", y: "68%", type: "medium", label: "Water request spike" },
] as const;

const COLORS = {
  critical: "bg-red-400 shadow-red-500/60",
  high: "bg-orange-300 shadow-orange-500/50",
  medium: "bg-amber-300 shadow-amber-500/45",
  low: "bg-cyan-300 shadow-cyan-400/45",
};

export function CrisisOperationsMap() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="glass-panel rounded-2xl p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Crisis Operations Map</h3>
        <span className="text-[10px] md:text-xs text-cyan-300 font-mono">LIVE FEED · SIMULATED</span>
      </div>

      <div className="relative h-56 md:h-72 rounded-xl border border-white/10 overflow-hidden bg-[linear-gradient(180deg,#0b1a2a,#091422)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,rgba(78,125,255,0.22),transparent_45%),radial-gradient(circle_at_75%_60%,rgba(255,112,125,0.16),transparent_42%)]" />
        <div className="absolute inset-0 terminal-grid opacity-40" />

        {MARKERS.map((marker, idx) => (
          <motion.div
            key={marker.id}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: idx * 0.08 }}
            style={{ left: marker.x, top: marker.y }}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
          >
            <motion.div
              animate={reduceMotion ? { opacity: 0.45 } : { scale: [1, 1.8, 1], opacity: [0.6, 0.08, 0.6] }}
              transition={reduceMotion ? { duration: 0 } : { repeat: Infinity, duration: 2.2 + idx * 0.2 }}
              className={`absolute inset-0 rounded-full blur-[1px] ${COLORS[marker.type]} w-4 h-4`}
            />
            <div className={`relative w-3 h-3 rounded-full shadow-lg ${COLORS[marker.type]}`} />
            <div className="absolute left-4 top-[-6px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity text-[11px] px-2 py-1 rounded bg-black/70 border border-white/15 text-gray-200">
              {marker.label}
            </div>
          </motion.div>
        ))}

        <div className="absolute right-3 bottom-3 text-[10px] text-gray-400 font-mono">
          Shelter · Risk Zone · Cluster · Escalation
        </div>
      </div>
    </section>
  );
}
