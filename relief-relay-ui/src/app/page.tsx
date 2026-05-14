"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Toaster, toast } from "react-hot-toast";
import { IntakePanel } from "@/components/IntakePanel";
import { TriageCard } from "@/components/TriageCard";
import { EvidenceRail } from "@/components/EvidenceRail";
import { ActionPacket } from "@/components/ActionPacket";
import { CaseList } from "@/components/CaseList";
import { LiveReasoningTimeline, type LoadingStep } from "@/components/LiveReasoningTimeline";
import { OfflineModeOverlay } from "@/components/OfflineModeOverlay";
import { CrisisOperationsMap } from "@/components/CrisisOperationsMap";
import { ImpactDashboard } from "@/components/ImpactDashboard";
import { CaseActivityFeed } from "@/components/CaseActivityFeed";
import { fetchCases, submitIntake } from "@/lib/api";
import type { IntakeResponse, Case } from "@/lib/types";

const STEP_LABELS: Record<LoadingStep, string> = {
  idle: "",
  extracting: "Extracting fields with Gemma 4…",
  retrieving: "Retrieving policy documents…",
  running_agent: "Running intake agent…",
  done: "Done",
};

export default function Home() {
  const [result, setResult] = useState<IntakeResponse | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>("idle");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== "undefined" ? !navigator.onLine : false));

  const refreshCases = useCallback(async () => {
    try {
      const data = await fetchCases();
      setCases(data.cases);
    } catch {
      // silently ignore if backend isn't running yet
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshCases();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshCases]);

  const handleSubmit = async (
    image?: File,
    voiceText?: string,
    manualText?: string,
  ) => {
    if (!image && !voiceText && !manualText) {
      toast.error("Please provide an image, voice note, or typed text.");
      return;
    }
    try {
      setResult(null);
      setLoadingStep("extracting");
      await new Promise((r) => setTimeout(r, 800));
      setLoadingStep("retrieving");
      await new Promise((r) => setTimeout(r, 600));
      setLoadingStep("running_agent");

      const data = await submitIntake(image, voiceText, manualText);
      setResult(data);
      setSelectedCaseId(data.case_id ?? null);
      setLoadingStep("done");
      await refreshCases();
      toast.success(`Case ${data.case_id} created`);
    } catch (err: unknown) {
      setLoadingStep("idle");
      const msg = err instanceof Error ? err.message : "Intake failed";
      toast.error(msg);
    }
  };

  useEffect(() => {
    const sync = () => setIsOffline(!navigator.onLine);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const isLoading = loadingStep !== "idle" && loadingStep !== "done";
  const latestCaseId = result?.case_id ?? selectedCaseId;

  return (
    <div className="min-h-screen text-gray-100 flex flex-col">
      <OfflineModeOverlay isOffline={isOffline} />

      <header className="border-b border-white/[0.08] px-5 md:px-8 py-4 flex items-center justify-between backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="text-lg md:text-xl font-semibold text-white">ReliefRelay</span>
          <span className="text-xs text-gray-500 font-mono">v2.0 · Command Center</span>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <span className="text-xs text-gray-400 font-mono hidden sm:block">
            Gemma 4 · RAG + Native Tooling · Local Inference
          </span>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isOffline ? "bg-amber-300" : "bg-emerald-400"} animate-pulse`} />
            <span className={`text-xs font-medium ${isOffline ? "text-amber-300" : "text-emerald-400"}`}>
              {isOffline ? "Offline operational mode" : "Online · Offline ready"}
            </span>
          </div>
        </div>
      </header>

      <section className="px-5 md:px-8 pt-8 pb-5">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl p-6 md:p-8">
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300 mb-2">Humanitarian Intelligence Platform</p>
          <h1 className="text-3xl md:text-5xl font-semibold leading-tight text-white max-w-4xl">
            When infrastructure fails, intelligence shouldn&apos;t.
          </h1>
          <p className="text-gray-300 mt-3 max-w-2xl text-sm md:text-base">
            Offline-first disaster coordination powered by Gemma 4. AI amplifies responders with explainable triage, evidence-linked decisions, and resilient local operations.
          </p>
          <div className="mt-6 grid md:grid-cols-3 gap-3">
            {["Problem", "How it works", "Offline-first intelligence"].map((item) => (
              <div key={item} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm text-gray-200">
                {item}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="px-5 md:px-8 pb-5">
        <ImpactDashboard totalCases={cases.length} />
      </section>

      {isLoading && (
        <div className="bg-blue-500/10 border-y border-blue-500/20 px-6 py-2 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
          <span className="text-sm text-blue-300 font-medium">
            {STEP_LABELS[loadingStep]}
          </span>
        </div>
      )}

      <main className="flex-1 px-5 md:px-8 pb-8 space-y-4">
        <div className="grid xl:grid-cols-[260px_minmax(0,1fr)_380px] gap-4">
          <aside className="glass-panel rounded-2xl overflow-hidden hidden xl:flex flex-col min-h-[620px]">
            <CaseList cases={cases} selectedCaseId={selectedCaseId} onSelect={setSelectedCaseId} />
          </aside>

          <div className="space-y-4">
            <IntakePanel onSubmit={handleSubmit} isLoading={isLoading} />
            <LiveReasoningTimeline loadingStep={loadingStep} isLoading={isLoading} />
            <CrisisOperationsMap />
            <div className="grid lg:grid-cols-2 gap-4">
              <CaseActivityFeed latestCaseId={latestCaseId} />
              <div className="glass-panel rounded-2xl p-4 md:p-5">
                <h3 className="text-sm font-semibold text-white mb-3">AI Explainability</h3>
                <p className="text-sm text-gray-300">
                  Every recommendation links to retrieval evidence, confidence cues, and an auditable action chain suitable for field decision support.
                </p>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            {result ? (
              <>
                <TriageCard result={result} />
                <ActionPacket result={result} />
                <EvidenceRail evidence={result.evidence} toolsUsed={result.tools_used} />
              </>
            ) : (
              <div className="glass-panel rounded-2xl p-5 text-sm text-gray-400">
                Submit intake data to activate triage, action packet generation, and evidence graphing.
              </div>
            )}
          </aside>
        </div>
        <div className="xl:hidden glass-panel rounded-2xl overflow-hidden">
          <CaseList cases={cases} selectedCaseId={selectedCaseId} onSelect={setSelectedCaseId} />
        </div>
      </main>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#1a2035",
            color: "#e8eaf0",
            border: "1px solid rgba(255,255,255,0.07)",
          },
        }}
      />
    </div>
  );
}
