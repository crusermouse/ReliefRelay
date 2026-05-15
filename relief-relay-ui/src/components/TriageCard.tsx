"use client";

import clsx from "clsx";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { IntakeResponse, TriageLevel } from "@/lib/types";

interface TriageCardProps {
  result: IntakeResponse;
}

const TRIAGE_STYLES: Record<TriageLevel, { badge: string; glow: string; ring: string; label: string; pulseBg: string }> = {
  RED: {
    badge: "bg-red-500/20 text-red-200 border border-red-500/40",
    glow: "border-red-500/25 bg-red-500/[0.04]",
    ring: "bg-red-400/40",
    pulseBg: "bg-red-400",
    label: "Critical — Immediate intervention required",
  },
  ORANGE: {
    badge: "bg-orange-500/20 text-orange-100 border border-orange-500/40",
    glow: "border-orange-500/25 bg-orange-500/[0.03]",
    ring: "bg-orange-300/35",
    pulseBg: "bg-orange-400",
    label: "High — Urgent response within 1–2 hours",
  },
  YELLOW: {
    badge: "bg-amber-500/20 text-amber-100 border border-amber-500/40",
    glow: "border-amber-500/25 bg-amber-500/[0.03]",
    ring: "bg-amber-300/30",
    pulseBg: "bg-amber-400",
    label: "Medium — Needs attention today",
  },
  GREEN: {
    badge: "bg-emerald-500/20 text-emerald-100 border border-emerald-500/40",
    glow: "border-emerald-500/25 bg-emerald-500/[0.03]",
    ring: "bg-emerald-300/25",
    pulseBg: "bg-emerald-400",
    label: "Stable — Standard allocation",
  },
};

const CONFIDENCE_STYLES: Record<string, string> = {
  high:   "text-emerald-400",
  medium: "text-amber-400",
  low:    "text-rose-400",
};

const URGENCY_MAP: Record<string, TriageLevel> = {
  critical: "RED",
  high:     "ORANGE",
  medium:   "YELLOW",
  low:      "GREEN",
  none:     "GREEN",
};

function Field({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  if (value === null || value === undefined || value === "" || value === false) return null;
  const displayValue = typeof value === "boolean" ? "Yes" : String(value);
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-3 py-2 md:py-2.5 border-b border-white/[0.04] last:border-0">
      <span className="text-[10px] md:text-[11px] text-gray-500 shrink-0 font-medium">{label}</span>
      <span className="text-[11px] md:text-[11px] text-gray-200 text-right md:text-right leading-relaxed capitalize">{displayValue}</span>
    </div>
  );
}

export function TriageCard({ result }: TriageCardProps) {
  const reduceMotion = useReducedMotion();
  const { intake_record, case_id } = result;
  const level: TriageLevel = URGENCY_MAP[intake_record.medical_urgency] ?? "GREEN";
  const styles = TRIAGE_STYLES[level];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 22 }}
      className={clsx("glass-panel border rounded-2xl p-4 space-y-4 relative overflow-hidden", styles.glow)}
    >
      {/* Animated background pulse for critical cases */}
      {level === "RED" && (
        <motion.div
          animate={{ opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 bg-red-500/10 pointer-events-none"
        />
      )}
      {/* Ambient corner glow — CSS-driven for GPU efficiency */}
      <div
        className={clsx(
          "absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl pointer-events-none",
          styles.ring,
          !reduceMotion && "ambient-pulse",
        )}
      />

      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-[10px] text-gray-600 font-mono tracking-wider">{case_id ?? "—"}</p>
          <h3 className="text-sm font-semibold text-white mt-0.5">Intake Record</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-shrink-0">
            <span className={clsx("block w-2.5 h-2.5 rounded-full", styles.pulseBg)} />
            {!reduceMotion && level === "RED" && (
              <span className={clsx("absolute inset-0 rounded-full animate-ping opacity-75", styles.pulseBg)} />
            )}
          </div>
          <span className={clsx("text-xs font-bold px-3 py-1.5 rounded-full", styles.badge)}>{level}</span>
        </div>
      </div>

      <p className="text-[11px] text-gray-500 relative z-10">{styles.label}</p>

      {/* Confidence */}
      <div className="flex items-center gap-2 relative z-10">
        <span className="text-[11px] text-gray-600">Extraction confidence:</span>
        <span className={clsx("text-[11px] font-semibold capitalize", CONFIDENCE_STYLES[intake_record.extraction_confidence] ?? "text-gray-500")}>
          {intake_record.extraction_confidence}
        </span>
      </div>

      {/* Fields */}
      <div className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.06] space-y-0 relative z-10">
        <Field label="Name" value={intake_record.name} />
        <Field label="Age" value={intake_record.age} />
        <Field label="Gender" value={intake_record.gender} />
        <Field label="Location" value={intake_record.location_found} />
        <Field label="Medical urgency" value={intake_record.medical_urgency} />
        <Field label="Family members" value={intake_record.family_members > 0 ? intake_record.family_members : undefined} />
        <Field label="Language" value={intake_record.language_preference !== "English" ? intake_record.language_preference : undefined} />
        <Field label="Shelter needed" value={intake_record.shelter_needed} />
        <Field label="Food needed" value={intake_record.food_needed} />
        <Field label="Water needed" value={intake_record.water_needed} />
        <Field label="Medication" value={intake_record.medication_needed} />
        <Field label="Special needs" value={intake_record.special_needs} />
      </div>

      {/* Presenting issues */}
      {intake_record.presenting_issues.length > 0 && (
        <div className="relative z-10">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Presenting Issues</p>
          <div className="flex flex-wrap gap-1.5">
            {intake_record.presenting_issues.map((issue, i) => (
              <span key={i} className="text-[11px] bg-white/[0.04] text-gray-300 border border-white/[0.07] px-2 py-1 rounded-md leading-tight">
                {issue}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missing info */}
      {intake_record.missing_information.length > 0 && (
        <div className="relative z-10">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
            <p className="text-[10px] text-amber-400 uppercase tracking-widest">Missing Information</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {intake_record.missing_information.map((item, i) => (
              <span key={i} className="text-[11px] bg-amber-500/[0.08] text-amber-400 border border-amber-500/20 px-2 py-1 rounded-md leading-tight">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
