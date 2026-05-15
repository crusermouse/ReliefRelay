"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, AlertCircle, Wifi, WifiOff } from "lucide-react";
import type { HealthResponse } from "@/lib/types";

interface OfflineModeOverlayProps {
  isOnline: boolean;
  backendReachable: boolean;
  health: HealthResponse | null;
}

function getOverlayCopy(isOnline: boolean, backendReachable: boolean, health: HealthResponse | null) {
  if (!isOnline) {
    return {
      title: "Internet disconnected",
      eyebrow: "NETWORK LOST",
      description: "The browser is offline. Local interface state remains visible, but new backend requests cannot be confirmed until connectivity returns.",
      systems: [
        "Browser network unavailable",
        "Historical cases remain visible",
        "New intake requests are paused",
      ],
    };
  }

  if (!backendReachable) {
    return {
      title: "Backend unavailable",
      eyebrow: "API UNREACHABLE",
      description: "The FastAPI service is not reachable from this browser session. Existing UI state remains intact, but live intake and export are unavailable.",
      systems: [
        "FastAPI service offline",
        "Case history may still be cached locally",
        "Retry when the backend returns",
      ],
    };
  }

  const ollamaReady = health?.services.ollama === "ready";
  if (!ollamaReady) {
    return {
      title: "Local AI unavailable",
      eyebrow: "OLLAMA DEGRADED",
      description: "The backend is reachable, but the local Gemma 4 service cannot be confirmed. Non-AI surfaces remain usable; AI intake will fall back or fail safely.",
      systems: [
        "Backend reachable",
        "Vector store status: " + (health?.services.vector_store ?? "unknown"),
        "AI requests are in degraded mode",
      ],
    };
  }

  if (health?.status !== "operational") {
    return {
      title: "Degraded operational mode",
      eyebrow: "LIMITED SERVICE",
      description: "Core surfaces are running locally, but at least one dependency is degraded. The platform will prefer safe fallbacks and honest status reporting.",
      systems: [
        `Backend: ${health?.services.backend ?? "unknown"}`,
        `Vector store: ${health?.services.vector_store ?? "unknown"}`,
        `Ollama: ${health?.services.ollama ?? "unknown"}`,
      ],
    };
  }

  return null;
}

function getStatusIndicator(isOnline: boolean, backendReachable: boolean, health: HealthResponse | null) {
  if (!isOnline) {
    return { icon: WifiOff, label: "🔴 Offline (no network)", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" };
  }
  if (!backendReachable) {
    return { icon: AlertCircle, label: "🔴 Backend unreachable", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" };
  }
  if (health?.status === "operational" && health?.services.ollama === "ready") {
    return { icon: Wifi, label: "🟢 Online (fully operational)", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" };
  }
  if (health?.status === "degraded") {
    return { icon: AlertCircle, label: "🟡 Degraded (using fallbacks)", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" };
  }
  return { icon: AlertTriangle, label: "🟡 Checking services…", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" };
}

export function OfflineModeOverlay({ isOnline, backendReachable, health }: OfflineModeOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid rendering status-dependent UI during SSR to prevent hydration
  // mismatches. The overlay is purely client-visible and can be mounted
  // after hydration without impacting accessibility.
  if (!mounted) return null;

  const copy = getOverlayCopy(isOnline, backendReachable, health);
  const statusIndicator = getStatusIndicator(isOnline, backendReachable, health);

  if (!copy) {
    // Show status indicator even when operational
    const StatusIcon = statusIndicator.icon;
    return (
      <motion.div 
        initial={{ opacity: 0, y: -8 }} 
        animate={{ opacity: 1, y: 0 }} 
        className={`fixed top-4 right-4 z-40 px-4 py-2 rounded-lg border flex items-center gap-2 ${statusIndicator.bg} ${statusIndicator.color}`}
      >
        <StatusIcon className="w-4 h-4" />
        <span className="text-xs font-semibold">{statusIndicator.label}</span>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      {copy && (
        <>
          {/* Status badge at top */}
          <motion.div 
            initial={{ opacity: 0, y: -8 }} 
            animate={{ opacity: 1, y: 0 }} 
            className={`fixed top-4 right-4 z-40 px-4 py-2 rounded-lg border flex items-center gap-2 ${statusIndicator.bg} ${statusIndicator.color}`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-semibold">{statusIndicator.label}</span>
          </motion.div>

          {/* Full modal overlay for critical issues */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none bg-bg-primary/80"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(105,212,255,0.16),transparent_55%)]" />
            <motion.div
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 12, opacity: 0 }}
              transition={{ type: "spring", stiffness: 180, damping: 20 }}
              className="max-w-lg mx-auto mt-22 glass-panel rounded-2xl p-6"
            >
              <div className="flex items-center gap-2 text-amber-300">
                <AlertTriangle className="w-4 h-4" />
                <p className="text-xs font-semibold tracking-[0.18em]">{copy.eyebrow}</p>
              </div>
              <p className="text-white text-lg font-semibold mt-2">{copy.title}</p>
              <p className="text-gray-300 text-sm mt-1">{copy.description}</p>
              <div className="mt-4 space-y-2">
                {copy.systems.map((item) => (
                  <div key={item} className="flex items-center gap-2 bg-emerald-500/8 border border-emerald-400/20 rounded-lg px-3 py-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span className="text-sm text-emerald-100">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
