"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FEED_EVENTS = [
  "Shelter capacity reduced in Sector C",
  "Medical escalation triggered for maternal care",
  "Resource allocation completed for water kits",
  "Voice note translated and attached to active case",
  "SOP match confidence improved with new evidence",
];

interface CaseActivityFeedProps {
  latestCaseId?: string | null;
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function CaseActivityFeed({ latestCaseId }: CaseActivityFeedProps) {
  const seed = useMemo(
    () =>
      FEED_EVENTS.slice(0, 3).map((text, i) => ({
        id: `seed-${i}`,
        text,
        time: nowTime(),
      })),
    [],
  );
  const [items, setItems] = useState<Array<{ id: string; text: string; time: string }>>(seed);

  useEffect(() => {
    if (!latestCaseId) return;
    const timer = window.setTimeout(() => {
      setItems((prev) => [{ id: latestCaseId, text: `Case ${latestCaseId} updated`, time: nowTime() }, ...prev].slice(0, 8));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [latestCaseId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const randomText = FEED_EVENTS[Math.floor(Math.random() * FEED_EVENTS.length)];
      setItems((prev) => [{ id: `${Date.now()}-${Math.random()}`, text: randomText, time: nowTime() }, ...prev].slice(0, 8));
    }, 6800);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="glass-panel rounded-2xl p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Case Activity Feed</h3>
        <span className="text-[10px] md:text-xs text-cyan-300 font-mono">AUTOSCROLL · LIVE</span>
      </div>
      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2"
            >
              <p className="text-xs text-gray-200">{item.text}</p>
              <p className="text-[10px] text-gray-500 mt-1 font-mono">{item.time}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
