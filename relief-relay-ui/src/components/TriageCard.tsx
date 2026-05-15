import { motion } from "framer-motion";
import { Home, UtensilsCrossed, Droplets, Pill, AlertTriangle } from "lucide-react";
import type { IntakeRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TriageCardProps {
  record: IntakeRecord;
}

const TRIAGE_STYLES = {
  GREEN: {
    color: "var(--triage-green)",
    bg: "var(--triage-green-bg)",
    border: "var(--triage-green-border)",
    label: "ROUTINE",
    subtext: "Standard processing queue"
  },
  YELLOW: {
    color: "var(--triage-yellow)",
    bg: "var(--triage-yellow-bg)",
    border: "var(--triage-yellow-border)",
    label: "URGENT",
    subtext: "Attend within 4 hours"
  },
  ORANGE: {
    color: "var(--triage-orange)",
    bg: "var(--triage-orange-bg)",
    border: "var(--triage-orange-border)",
    label: "EMERGENT",
    subtext: "Attend within 60 minutes"
  },
  RED: {
    color: "var(--triage-red)",
    bg: "var(--triage-red-bg)",
    border: "var(--triage-red-border)",
    label: "CRITICAL",
    subtext: "Immediate attention required"
  }
};

const CONFIDENCE_LEVELS = {
  low: { width: "33%", color: "bg-triage-red", label: "Low confidence" },
  medium: { width: "66%", color: "bg-triage-yellow", label: "Medium confidence" },
  high: { width: "100%", color: "bg-triage-green", label: "High confidence" }
};

function getTriageLevel(urgency: string): keyof typeof TRIAGE_STYLES {
  switch (urgency) {
    case "critical": return "RED";
    case "high": return "ORANGE";
    case "medium": return "YELLOW";
    case "low":
    case "none":
    default:
      return "GREEN";
  }
}

export function TriageCard({ record }: TriageCardProps) {
  const level = getTriageLevel(record.medical_urgency);
  const style = TRIAGE_STYLES[level];
  const conf = CONFIDENCE_LEVELS[record.extraction_confidence || "medium"];

  return (
    <div className="bg-bg-secondary border border-border rounded-[16px] overflow-hidden">

      {/* TOP TRIAGE BAR */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="h-[44px] flex items-center px-[16px] gap-[12px]"
        style={{
          backgroundColor: style.bg,
          borderLeft: `4px solid ${style.color}`,
          borderBottom: "1px solid var(--border)"
        }}
      >
        <div className="relative flex h-3 w-3 items-center justify-center">
          {level === "RED" && (
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-[pulse_2s_ease-out_infinite]"
              style={{ backgroundColor: style.color }}
            />
          )}
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ backgroundColor: style.color }}
          />
        </div>
        <span className="font-semibold text-[13px] tracking-wider text-text-primary" style={{ color: style.color }}>
          {style.label}
        </span>
        <span className="text-[13px] text-text-secondary hidden sm:inline-block">— {style.subtext}</span>
      </motion.div>

      <div className="p-[16px] md:p-[24px] flex flex-col gap-[20px]">

        {/* NAME ROW */}
        <div className="flex flex-col gap-[4px]">
          <h3 className="text-[18px] font-semibold text-text-primary">
            {record.name || "Unknown Individual"}
          </h3>
          <div className="flex flex-wrap items-center gap-x-[12px] gap-y-[4px] text-[15px] text-text-secondary">
            {record.age ? <span>{record.age} yrs</span> : <span>Age unknown</span>}
            <span className="opacity-50">·</span>
            <span>{record.gender || "Gender unspec."}</span>
            {record.location_found && (
              <>
                <span className="opacity-50">·</span>
                <span>Found: {record.location_found}</span>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-[8px] mt-[8px]">
            <span className="bg-bg-surface border border-border px-[8px] py-[2px] rounded-[6px] text-[12px] font-medium text-text-primary">
              Family of {record.family_members || 1}
            </span>
            <span className="bg-bg-surface border border-border px-[8px] py-[2px] rounded-[6px] text-[12px] font-medium text-text-primary">
              {record.language_preference || "English"}
            </span>
          </div>
        </div>

        {/* NEEDS */}
        <div className="flex flex-col gap-[12px] border-t border-border pt-[20px]">
          <h4 className="text-[13px] font-semibold text-text-muted uppercase tracking-[0.08em]">Needs</h4>
          <div className="flex flex-wrap gap-[8px]">
            {record.shelter_needed && (
              <div className="flex items-center gap-[6px] bg-bg-surface border border-border px-[12px] py-[6px] rounded-[6px]">
                <Home size={14} className="text-text-secondary" />
                <span className="text-[13px] font-medium text-text-primary">Shelter</span>
              </div>
            )}
            {record.food_needed && (
              <div className="flex items-center gap-[6px] bg-bg-surface border border-border px-[12px] py-[6px] rounded-[6px]">
                <UtensilsCrossed size={14} className="text-text-secondary" />
                <span className="text-[13px] font-medium text-text-primary">Food</span>
              </div>
            )}
            {record.water_needed && (
              <div className="flex items-center gap-[6px] bg-bg-surface border border-border px-[12px] py-[6px] rounded-[6px]">
                <Droplets size={14} className="text-text-secondary" />
                <span className="text-[13px] font-medium text-text-primary">Water</span>
              </div>
            )}
            {record.medication_needed && record.medication_needed.toLowerCase() !== "none" && (
              <div className="flex flex-col bg-bg-surface border border-border px-[12px] py-[6px] rounded-[6px]">
                <div className="flex items-center gap-[6px]">
                  <Pill size={14} className="text-text-secondary" />
                  <span className="text-[13px] font-medium text-text-primary">Medication</span>
                </div>
                {typeof record.medication_needed === "string" && record.medication_needed.toLowerCase() !== "true" && (
                  <span className="text-[12px] text-text-muted mt-[2px] pl-[20px]">{record.medication_needed}</span>
                )}
              </div>
            )}
            {!record.shelter_needed && !record.food_needed && !record.water_needed && !record.medication_needed && (
              <span className="text-[13px] text-text-muted">No specific physical needs identified.</span>
            )}
          </div>
        </div>

        {/* CONFIDENCE */}
        <div className="flex flex-col gap-[8px] border-t border-border pt-[20px]">
          <div className="flex justify-between items-center text-[12px] font-medium uppercase tracking-[0.08em] text-text-muted">
            <span>Confidence</span>
            <span>{conf.label}</span>
          </div>
          <div className="h-[6px] bg-bg-surface rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: conf.width }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={cn("h-full rounded-full", conf.color)}
            />
          </div>
        </div>

        {/* MISSING INFO */}
        {record.missing_information && record.missing_information.length > 0 && (
          <div className="mt-[4px] bg-triage-orange-bg border border-triage-orange-border border-l-[4px] border-l-triage-orange rounded-[8px] p-[16px]">
            <p className="text-[13px] font-semibold text-text-primary mb-[8px]">Ask the volunteer to clarify:</p>
            <ul className="flex flex-col gap-[6px]">
              {record.missing_information.map((info, i) => (
                <li key={i} className="flex items-start gap-[8px] text-[13px] text-text-primary">
                  <AlertTriangle size={14} className="text-triage-orange mt-[2px] shrink-0" />
                  <span>{info}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}
