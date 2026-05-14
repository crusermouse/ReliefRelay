"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { CheckCircle2, LoaderCircle, AlertCircle } from "lucide-react";
import type { WorkflowEvent } from "@/lib/types";

export type LoadingStep = "idle" | "extracting" | "retrieving" | "running_agent" | "done";

interface LiveReasoningTimelineProps {
  loadingStep: LoadingStep;
  isLoading: boolean;
  events: WorkflowEvent[];
}

const EVENT_LABELS: Record<string, string> = {
  extraction: "Extraction complete",
  retrieval: "Policy retrieval complete",
  "tool-calling": "Tool calling complete",
  "packet-generation": "Action packet generated",
  persistence: "Case persisted",
};

const EVENT_ICONS: Record<string, typeof CheckCircle2> = {
  complete: CheckCircle2,
  fallback: AlertCircle,
  failed: AlertCircle,
};

function formatEventLabel(event: WorkflowEvent) {
  return EVENT_LABELS[event.stage] ?? event.stage.replace(/-/g, " ");
}

export function LiveReasoningTimeline({ loadingStep, isLoading, events }: LiveReasoningTimelineProps) {
  return (
    <section className="glass-panel terminal-grid rounded-2xl p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Live AI Reasoning Timeline</h3>
        <span className="text-[10px] md:text-xs font-mono text-cyan-300">
          {isLoading ? "PROCESSING · REAL STATES" : "READY · LOCAL INFERENCE"}
        </span>
      </div>

      {events.length === 0 && isLoading ? (
        <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-3 py-3 flex items-center gap-3">
          <LoaderCircle className="w-4 h-4 animate-spin text-cyan-300" />
          <span className="text-xs md:text-sm font-mono text-cyan-100">Waiting for backend response…</span>
        </div>
      ) : (
        <div className="space-y-2.5">
          {events.map((event, idx) => {
            const done = event.status === "complete";
            const active = isLoading && idx === events.length - 1 && event.status !== "failed";
            const Icon = EVENT_ICONS[event.status] ?? CheckCircle2;
            return (
              <motion.div
                key={`${event.stage}-${idx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.04 }}
                className={clsx(
                  "flex items-center gap-3 rounded-lg border px-3 py-2",
                  done
                    ? "border-emerald-400/30 bg-emerald-500/8"
                    : event.status === "fallback"
                      ? "border-amber-400/35 bg-amber-500/10"
                      : event.status === "failed"
                        ? "border-rose-400/35 bg-rose-500/10"
                        : active
                          ? "border-cyan-400/35 bg-cyan-500/10"
                          : "border-white/7 bg-white/[0.02]",
                )}
              >
                <span
                  className={clsx(
                    "w-4 h-4 rounded-full grid place-items-center",
                    done ? "text-emerald-300" : event.status === "fallback" ? "text-amber-300" : event.status === "failed" ? "text-rose-300" : active ? "text-cyan-300" : "text-gray-500",
                  )}
                >
                  <Icon className={clsx("w-4 h-4", active && "animate-spin")} />
                </span>
                <span className={clsx("text-xs md:text-sm font-mono", done ? "text-emerald-200" : event.status === "fallback" ? "text-amber-100" : event.status === "failed" ? "text-rose-100" : active ? "text-cyan-100 text-glow" : "text-gray-400")}>
                  {formatEventLabel(event)}
                </span>
              </motion.div>
            );
          })}

          {loadingStep !== "done" && events.length > 0 && isLoading && (
            <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-3 py-3 flex items-center gap-3">
              <LoaderCircle className="w-4 h-4 animate-spin text-cyan-300" />
              <span className="text-xs md:text-sm font-mono text-cyan-100">Awaiting final backend confirmation…</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
