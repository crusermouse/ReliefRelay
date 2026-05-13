"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface OfflineModeOverlayProps {
  isOffline: boolean;
}

const SYSTEMS = [
  "Local Gemma 4 Active",
  "Offline Vector Database Active",
  "Emergency Coordination Continues",
];

export function OfflineModeOverlay({ isOffline }: OfflineModeOverlayProps) {
  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 pointer-events-none bg-[#05080ecc]"
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
              <p className="text-xs font-semibold tracking-[0.18em]">CONNECTION LOST</p>
            </div>
            <p className="text-white text-lg font-semibold mt-2">Offline Operational Mode</p>
            <p className="text-gray-300 text-sm mt-1">Edge AI resilience protocol engaged. Core response systems remain active.</p>
            <div className="mt-4 space-y-2">
              {SYSTEMS.map((item) => (
                <div key={item} className="flex items-center gap-2 bg-emerald-500/8 border border-emerald-400/20 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span className="text-sm text-emerald-100">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
