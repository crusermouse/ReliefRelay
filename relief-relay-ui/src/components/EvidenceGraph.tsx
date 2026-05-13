"use client";

import { motion } from "framer-motion";
import type { IntakeResponse } from "@/lib/types";

interface EvidenceGraphProps {
  result: IntakeResponse | null;
}

interface EvidenceNode {
  id: string;
  title: string;
  subtitle: string;
  confidence: string;
  tone: "cyan" | "amber" | "red" | "blue";
}

const TONE_STYLES: Record<EvidenceNode["tone"], string> = {
  cyan: "border-cyan-300/35 bg-cyan-400/10",
  amber: "border-amber-300/35 bg-amber-300/12",
  red: "border-rose-300/35 bg-rose-400/12",
  blue: "border-blue-300/35 bg-blue-400/12",
};

function toNodes(result: IntakeResponse | null): EvidenceNode[] {
  if (!result) {
    return [
      {
        id: "fact",
        title: "Incoming humanitarian signal",
        subtitle: "Awaiting intake extraction",
        confidence: "--",
        tone: "blue",
      },
      {
        id: "sop",
        title: "Policy linkage",
        subtitle: "WHO / Sphere references",
        confidence: "--",
        tone: "cyan",
      },
      {
        id: "decision",
        title: "Triage decision",
        subtitle: "Risk class pending",
        confidence: "--",
        tone: "amber",
      },
    ];
  }

  const fact = result.intake_record.special_needs || result.intake_record.presenting_issues[0] || "Vulnerable civilian needs support";
  const source = result.evidence[0]?.source.split("/").pop() ?? "Relief guideline";
  const urgency = result.intake_record.medical_urgency;
  const tone: EvidenceNode["tone"] = urgency === "critical" ? "red" : urgency === "high" ? "amber" : "cyan";

  return [
    {
      id: "fact",
      title: fact,
      subtitle: "Extracted field evidence",
      confidence: result.intake_record.extraction_confidence,
      tone: "blue",
    },
    {
      id: "sop",
      title: source,
      subtitle: "Retrieved emergency SOP",
      confidence: "grounded",
      tone: "cyan",
    },
    {
      id: "decision",
      title: `${urgency.toUpperCase()} risk classification`,
      subtitle: "Recommended immediate coordination path",
      confidence: "high",
      tone,
    },
  ];
}

export function EvidenceGraph({ result }: EvidenceGraphProps) {
  const nodes = toNodes(result);

  return (
    <section className="glass-panel rounded-2xl p-4 sm:p-5">
      <div className="mb-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/70">Trust graph</p>
        <h3 className="mt-1 text-base font-semibold text-white">Evidence-to-decision chain</h3>
      </div>

      <div className="space-y-3">
        {nodes.map((node, idx) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08, type: "spring", stiffness: 200, damping: 20 }}
            className="group"
          >
            <div className={`rounded-xl border px-3.5 py-3 transition-all group-hover:shadow-[0_0_32px_rgba(93,231,255,0.12)] ${TONE_STYLES[node.tone]}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-100">{node.title}</p>
                  <p className="mt-1 text-xs text-slate-300/75">{node.subtitle}</p>
                </div>
                <span className="rounded-full border border-white/15 bg-black/25 px-2 py-0.5 text-[11px] font-mono text-slate-200">
                  {node.confidence}
                </span>
              </div>
            </div>
            {idx < nodes.length - 1 && (
              <div className="mx-auto my-1.5 h-7 w-px bg-gradient-to-b from-cyan-300/60 via-blue-300/40 to-transparent" />
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
