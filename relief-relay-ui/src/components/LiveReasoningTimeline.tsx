"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { CheckCircle2, LoaderCircle } from "lucide-react";

export type LoadingStep = "idle" | "extracting" | "retrieving" | "running_agent" | "done";

const TIMELINE_STEPS = [
  { key: "extracting", label: "Processing handwritten intake form" },
  { key: "extracting", label: "Translating Hindi voice note" },
  { key: "extracting", label: "Detecting vulnerable individuals" },
  { key: "running_agent", label: "Running triage analysis" },
  { key: "retrieving", label: "Searching emergency SOPs" },
  { key: "running_agent", label: "Matching shelter resources" },
  { key: "done", label: "Generating action packet" },
] as const;

const STEP_INDEX: Record<LoadingStep, number> = {
  idle: -1,
  extracting: 2,
  retrieving: 4,
  running_agent: 5,
  done: 6,
};

interface LiveReasoningTimelineProps {
  loadingStep: LoadingStep;
  isLoading: boolean;
}

function streamedLabel(label: string, progress: number) {
  const count = Math.max(4, Math.floor(label.length * progress));
  return label.slice(0, count);
}

export function LiveReasoningTimeline({ loadingStep, isLoading }: LiveReasoningTimelineProps) {
  const current = STEP_INDEX[loadingStep];
  const [streamProgress, setStreamProgress] = useState(0.65);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStreamProgress((prev) => (prev >= 1 ? 0.65 : Number((prev + 0.05).toFixed(2))));
    }, 120);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="glass-panel terminal-grid rounded-2xl p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Live AI Reasoning Timeline</h3>
        <span className="text-[10px] md:text-xs font-mono text-cyan-300">
          {isLoading ? "STREAMING · GEMMA 4" : "READY · LOCAL INFERENCE"}
        </span>
      </div>

      <div className="space-y-2.5">
        {TIMELINE_STEPS.map((step, idx) => {
          const done = current > idx || loadingStep === "done";
          const active = current === idx && isLoading;
          const visible = current >= idx || loadingStep === "done";
          return (
            <motion.div
              key={`${step.label}-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: visible ? 1 : 0.35, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.06 }}
              className={clsx(
                "flex items-center gap-3 rounded-lg border px-3 py-2",
                done
                  ? "border-emerald-400/30 bg-emerald-500/8"
                  : active
                    ? "border-cyan-400/35 bg-cyan-500/10"
                    : "border-white/7 bg-white/[0.02]",
              )}
            >
              <span
                className={clsx(
                  "w-4 h-4 rounded-full grid place-items-center",
                  done ? "text-emerald-300" : active ? "text-cyan-300 pulse-ring" : "text-gray-500",
                )}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : <LoaderCircle className={clsx("w-4 h-4", active && "animate-spin")} />}
              </span>
              <span className={clsx("text-xs md:text-sm font-mono", done ? "text-emerald-200" : active ? "text-cyan-100 text-glow" : "text-gray-400")}>
                {active ? streamedLabel(step.label, streamProgress) : step.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
