"use client";

import clsx from "clsx";
import { motion } from "framer-motion";
import type { IntakeResponse, TriageLevel } from "@/lib/types";

interface TriageCardProps {
  result: IntakeResponse;
}

const TRIAGE_STYLES: Record<TriageLevel, { badge: string; glow: string; ring: string; label: string }> = {
  RED: {
    badge: "bg-red-500/20 text-red-200 border border-red-500/40",
    glow: "border-red-500/30 bg-red-500/[0.05]",
    ring: "bg-red-400 shadow-red-500/60",
    label: "Critical — Immediate intervention",
  },
  ORANGE: {
    badge: "bg-orange-500/20 text-orange-100 border border-orange-500/40",
    glow: "border-orange-500/30 bg-orange-500/[0.04]",
    ring: "bg-orange-300 shadow-orange-500/50",
    label: "High — Urgent (1-2 hours)",
  },
  YELLOW: {
    badge: "bg-amber-500/20 text-amber-100 border border-amber-500/40",
    glow: "border-amber-500/30 bg-amber-500/[0.03]",
    ring: "bg-amber-300 shadow-amber-500/45",
    label: "Medium — Needs attention today",
  },
  GREEN: {
    badge: "bg-emerald-500/20 text-emerald-100 border border-emerald-500/40",
    glow: "border-emerald-500/30 bg-emerald-500/[0.03]",
    ring: "bg-emerald-300 shadow-emerald-500/45",
    label: "Stable — Standard allocation",
  },
};

const CONFIDENCE_STYLES = {
  high: "text-emerald-400",
  medium: "text-amber-400",
  low: "text-gray-500",
};

function Field({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  if (value === null || value === undefined || value === "" || value === false) return null;
  const displayValue = typeof value === "boolean" ? "Yes" : String(value);
  return (
    <div className="flex items-start justify-between gap-2 py-1.5 border-b border-white/[0.04] last:border-0">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-xs text-gray-300 text-right">{displayValue}</span>
    </div>
  );
}

export function TriageCard({ result }: TriageCardProps) {
  const { intake_record, case_id } = result;

  // Derive triage level from medical urgency if not directly available
  const triageLevelMap: Record<string, TriageLevel> = {
    critical: "RED",
    high: "ORANGE",
    medium: "YELLOW",
    low: "GREEN",
    none: "GREEN",
  };
  const level: TriageLevel = triageLevelMap[intake_record.medical_urgency] ?? "GREEN";
  const styles = TRIAGE_STYLES[level];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx("glass-panel border rounded-xl p-4 space-y-4 relative overflow-hidden", styles.glow)}
    >
      <motion.div
        animate={{ opacity: [0.3, 0.75, 0.3], scale: [1, 1.06, 1] }}
        transition={{ repeat: Infinity, duration: 1.9 }}
        className={clsx("absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl", styles.ring)}
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-mono">{case_id ?? "No case ID"}</p>
          <h3 className="text-sm font-semibold text-white mt-0.5">Intake Record</h3>
        </div>
        <div className="flex items-center gap-2">
          <motion.span
            animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 1.7 }}
            className={clsx("w-2.5 h-2.5 rounded-full shadow-lg", styles.ring)}
          />
          <span className={clsx("text-xs font-bold px-3 py-1.5 rounded-full", styles.badge)}>{level}</span>
        </div>
      </div>

      <p className="text-xs text-gray-500">{styles.label}</p>

      {/* Confidence */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600">Extraction confidence:</span>
        <span className={clsx("text-xs font-medium capitalize", CONFIDENCE_STYLES[intake_record.extraction_confidence])}>
          {intake_record.extraction_confidence}
        </span>
      </div>

      {/* Fields */}
      <div className="bg-white/[0.02] rounded-lg p-3 border border-white/8">
        <Field label="Name" value={intake_record.name} />
        <Field label="Age" value={intake_record.age} />
        <Field label="Gender" value={intake_record.gender} />
        <Field label="Location" value={intake_record.location_found} />
        <Field label="Medical urgency" value={intake_record.medical_urgency} />
        <Field label="Family members" value={intake_record.family_members} />
        <Field label="Language" value={intake_record.language_preference} />
        <Field label="Shelter needed" value={intake_record.shelter_needed} />
        <Field label="Food needed" value={intake_record.food_needed} />
        <Field label="Water needed" value={intake_record.water_needed} />
        <Field label="Medication" value={intake_record.medication_needed} />
        <Field label="Special needs" value={intake_record.special_needs} />
      </div>

      {/* Presenting issues */}
      {intake_record.presenting_issues.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Presenting issues</p>
          <div className="flex flex-wrap gap-1.5">
            {intake_record.presenting_issues.map((issue, i) => (
              <span key={i} className="text-xs bg-white/[0.05] text-gray-300 px-2 py-1 rounded-md">
                {issue}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missing info */}
      {intake_record.missing_information.length > 0 && (
        <div>
          <p className="text-xs text-amber-500 mb-2">⚠ Missing information</p>
          <div className="flex flex-wrap gap-1.5">
            {intake_record.missing_information.map((item, i) => (
              <span key={i} className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded-md">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
