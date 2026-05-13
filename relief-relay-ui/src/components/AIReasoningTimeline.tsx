"use client";

import { motion } from "framer-motion";
import { CheckCircle2, LoaderCircle } from "lucide-react";

type StepStatus = "pending" | "active" | "done";

interface AIReasoningTimelineProps {
  activeIndex: number;
  done: boolean;
}

const STEPS = [
  "Processing handwritten intake form",
  "Translating Hindi voice note",
  "Detecting vulnerable individuals",
  "Running triage analysis",
  "Searching emergency SOPs",
  "Matching shelter resources",
  "Generating action packet",
];

function statusFor(index: number, activeIndex: number, done: boolean): StepStatus {
  if (done) return "done";
  if (index < activeIndex) return "done";
  if (index === activeIndex) return "active";
  return "pending";
}

export function AIReasoningTimeline({ activeIndex, done }: AIReasoningTimelineProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl p-4 sm:p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/70">Live model reasoning</p>
          <h2 className="mt-1 text-base font-semibold text-white">Gemma 4 activity stream</h2>
        </div>
        <div className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-mono text-cyan-200">
          {done ? "COMPLETE" : "STREAMING"}
        </div>
      </div>

      <div className="space-y-2.5">
        {STEPS.map((step, index) => {
          const status = statusFor(index, activeIndex, done);
          return (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.06 }}
              className="relative overflow-hidden rounded-xl border border-white/8 bg-black/20 px-3 py-2"
            >
              {status === "active" && (
                <motion.div
                  layoutId="active-step"
                  className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 via-blue-400/15 to-transparent"
                />
              )}
              <div className="relative flex items-center gap-2.5">
                {status === "done" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                ) : status === "active" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin text-cyan-200" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-white/20" />
                )}
                <p
                  className={`text-xs sm:text-sm ${
                    status === "pending" ? "text-slate-400" : "text-slate-100"
                  } ${status === "active" ? "terminal-caret" : ""}`}
                >
                  {status === "done" ? "[✓]" : status === "active" ? "[~]" : "[ ]"} {step}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
