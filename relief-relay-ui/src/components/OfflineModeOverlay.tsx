"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface OfflineModeOverlayProps {
  show: boolean;
}

const STATUS = [
  "Local Gemma 4 Active",
  "Offline Vector Database Active",
  "Emergency Coordination Continues",
];

export function OfflineModeOverlay({ show }: OfflineModeOverlayProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#02040a]/80 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ y: 18, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -6, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="glass-panel w-full max-w-xl rounded-2xl border border-cyan-200/25 px-5 py-6"
          >
            <div className="mb-5 flex items-start gap-3">
              <div className="rounded-full border border-amber-300/40 bg-amber-300/15 p-2.5 text-amber-200">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-amber-200/75">Offline operational mode</p>
                <h3 className="mt-1 text-lg font-semibold text-white">⚠ Connection lost</h3>
                <p className="mt-1 text-sm text-slate-300/85">
                  External network unavailable. ReliefRelay switched to resilient local coordination.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {STATUS.map((item, index) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-2.5 rounded-lg border border-emerald-300/25 bg-emerald-300/8 px-3 py-2"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  <span className="text-sm text-emerald-100">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
