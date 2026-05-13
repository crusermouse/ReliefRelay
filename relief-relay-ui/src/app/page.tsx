"use client";

import { useState, useEffect, useCallback } from "react";
import { Toaster, toast } from "react-hot-toast";
import { IntakePanel } from "@/components/IntakePanel";
import { TriageCard } from "@/components/TriageCard";
import { EvidenceRail } from "@/components/EvidenceRail";
import { ActionPacket } from "@/components/ActionPacket";
import { CaseList } from "@/components/CaseList";
import { fetchCases, submitIntake } from "@/lib/api";
import type { IntakeResponse, Case } from "@/lib/types";

type LoadingStep =
  | "idle"
  | "extracting"
  | "retrieving"
  | "running_agent"
  | "done";

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

  const refreshCases = useCallback(async () => {
    try {
      const data = await fetchCases();
      setCases(data.cases);
    } catch {
      // silently ignore if backend isn't running yet
    }
  }, []);

  useEffect(() => {
    refreshCases();
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

  const isLoading = loadingStep !== "idle" && loadingStep !== "done";

  return (
    <div className="min-h-screen bg-[#0a0c10] text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-white/[0.07] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-white">ReliefRelay</span>
          <span className="text-xs text-gray-500 font-mono">v1.0</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-xs text-gray-500 font-mono hidden sm:block">
            Gemma 4 E4B · Local
          </span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">Offline ready</span>
          </div>
        </div>
      </header>

      {/* Loading banner */}
      {isLoading && (
        <div className="bg-blue-500/10 border-b border-blue-500/20 px-6 py-2 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
          <span className="text-sm text-blue-300 font-medium">
            {STEP_LABELS[loadingStep]}
          </span>
        </div>
      )}

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Case list */}
        <aside className="w-64 border-r border-white/[0.07] hidden lg:flex flex-col">
          <CaseList
            cases={cases}
            selectedCaseId={selectedCaseId}
            onSelect={setSelectedCaseId}
          />
        </aside>

        {/* CENTER: Intake panel */}
        <main className="flex-1 overflow-y-auto p-6">
          <IntakePanel onSubmit={handleSubmit} isLoading={isLoading} />
          {cases.length > 0 && (
            <p className="lg:hidden mt-4 text-xs text-gray-500">
              {cases.length} case{cases.length !== 1 ? "s" : ""} recorded this session
            </p>
          )}
        </main>

        {/* RIGHT: Results (desktop) */}
        {result && (
          <aside className="w-96 border-l border-white/[0.07] overflow-y-auto p-4 space-y-4 hidden xl:block">
            <TriageCard result={result} />
            <ActionPacket result={result} />
            <EvidenceRail evidence={result.evidence} toolsUsed={result.tools_used} />
          </aside>
        )}
      </div>

      {/* Mobile results */}
      {result && (
        <div className="xl:hidden border-t border-white/[0.07] p-4 space-y-4">
          <TriageCard result={result} />
          <ActionPacket result={result} />
          <EvidenceRail evidence={result.evidence} toolsUsed={result.tools_used} />
        </div>
      )}

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
