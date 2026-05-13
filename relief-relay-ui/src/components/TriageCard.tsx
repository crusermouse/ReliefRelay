"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import type { IntakeResponse, TriageLevel } from "@/lib/types";

interface TriageCardProps {
  result: IntakeResponse;
}

const TRIAGE_STYLES: Record<
  TriageLevel,
  { badge: string; border: string; pulse: string; label: string }
> = {
  RED: {
    badge: "bg-rose-400/20 text-rose-100 border-rose-300/40",
    border: "border-rose-300/35",
    pulse: "bg-rose-300/40",
    label: "Critical · Immediate medical intervention",
  },
  ORANGE: {
    badge: "bg-amber-300/20 text-amber-100 border-amber-200/45",
    border: "border-amber-200/35",
    pulse: "bg-amber-300/40",
    label: "High · Urgent stabilization window",
  },
  YELLOW: {
    badge: "bg-yellow-200/20 text-yellow-100 border-yellow-100/35",
    border: "border-yellow-100/30",
    pulse: "bg-yellow-200/35",
    label: "Medium · Prioritized same-day support",
  },
  GREEN: {
    badge: "bg-emerald-300/20 text-emerald-100 border-emerald-200/40",
    border: "border-emerald-200/30",
    pulse: "bg-emerald-300/35",
    label: "Stable · Standard response route",
  },
};

const CONFIDENCE_STYLES = {
  high: "text-emerald-200",
  medium: "text-amber-200",
  low: "text-slate-400",
};

function Field({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  if (value === null || value === undefined || value === "" || value === false) return null;
  const displayValue = typeof value === "boolean" ? "Yes" : String(value);
  return (
    <div className="flex items-start justify-between gap-2 border-b border-white/7 py-1.5 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-right text-xs text-slate-200">{displayValue}</span>
    </div>
  );
}

export function TriageCard({ result }: TriageCardProps) {
  const { intake_record, case_id } = result;
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
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx("glass-panel relative overflow-hidden rounded-2xl border p-4", styles.border)}
    >
      <span className={clsx("pulse-halo absolute -right-6 -top-6 h-24 w-24 rounded-full", styles.pulse)} />

      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="font-mono text-xs text-slate-400">{case_id ?? "No case ID"}</p>
            <h3 className="mt-0.5 text-sm font-semibold text-white">Advanced triage profile</h3>
          </div>
          <span className={clsx("rounded-full border px-3 py-1 text-xs font-bold", styles.badge)}>{level}</span>
        </div>

        <p className="mb-3 text-xs text-slate-300/80">{styles.label}</p>

        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs text-slate-400">Extraction confidence:</span>
          <span className={clsx("text-xs font-semibold capitalize", CONFIDENCE_STYLES[intake_record.extraction_confidence])}>
            {intake_record.extraction_confidence}
          </span>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
          <Field label="Name" value={intake_record.name} />
          <Field label="Age" value={intake_record.age} />
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

        {intake_record.presenting_issues.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-xs text-slate-400">Presenting issues</p>
            <div className="flex flex-wrap gap-1.5">
              {intake_record.presenting_issues.map((issue) => (
                <span key={issue} className="rounded-md border border-white/15 bg-white/6 px-2 py-1 text-xs text-slate-200">
                  {issue}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}
