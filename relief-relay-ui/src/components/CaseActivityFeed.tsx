"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Zap } from "lucide-react";

const FEED_EVENTS = [
  "Shelter capacity reduced in Sector C",
  "Medical escalation triggered for maternal care",
  "Resource allocation completed for water kits",
  "Voice note translated and attached to active case",
  "SOP match confidence improved with new evidence",
  "New case routed to trauma triage pathway",
  "PDF referral packet generated and logged",
];

interface CaseActivityFeedProps {
  latestCaseId?: string | null;
}

function formatTime(date: Date) {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 || 12;
  const displayM = m < 10 ? `0${m}` : m;
  return `${displayH}:${displayM} ${ampm}`;
}

interface FeedItem {
  id: string;
  text: string;
  time: string;
  isNew?: boolean;
}

export function CaseActivityFeed({ latestCaseId }: CaseActivityFeedProps) {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<FeedItem[]>([]);

  useEffect(() => {
    setMounted(true);
    const now = new Date();
    // Build deterministic seed events with accurate timestamps
    const seeds: FeedItem[] = FEED_EVENTS.slice(0, 4).map((text, i) => {
      const t = new Date(now.getTime() - (4 - i) * 3 * 60 * 1000);
      return { id: `seed-${i}`, text, time: formatTime(t) };
    });
    setItems(seeds);
  }, []);

  // When a new case comes in, prepend it to the feed
  useEffect(() => {
    if (!latestCaseId || !mounted) return;
    const now = new Date();
    const newItem: FeedItem = {
      id: `case-${latestCaseId}-${Date.now()}`,
      text: `Case ${latestCaseId} processed — action packet ready`,
      time: formatTime(now),
      isNew: true,
    };
    setItems((prev) => [newItem, ...prev.filter((i) => !i.id.startsWith(`case-${latestCaseId}`))].slice(0, 8));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestCaseId]);

  return (
    <section className="glass-panel rounded-2xl p-4 md:p-5 flex flex-col" aria-label="Case activity feed">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Activity Feed</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="w-1 h-1 rounded-full bg-cyan-400"
          />
          <span className="text-[9px] md:text-[10px] text-cyan-400 font-mono tracking-widest">LIVE</span>
        </div>
      </div>

      <div className="space-y-1.5 flex-1 overflow-y-auto max-h-52 pr-0.5" role="log" aria-live="polite" aria-atomic="false">
        <AnimatePresence initial={false} mode="popLayout">
          {!mounted ? (
            // SSR-safe skeleton
            [0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 h-12 shimmer" />
            ))
          ) : items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              className={`rounded-lg border px-3 py-2.5 ${
                item.isNew
                  ? "border-cyan-400/20 bg-cyan-500/[0.04]"
                  : "border-white/[0.05] bg-white/[0.02]"
              }`}
            >
              <div className="flex items-start gap-2">
                {item.isNew && (
                  <Zap className="w-3 h-3 text-cyan-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className="text-[12px] text-gray-200 leading-snug">{item.text}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5 font-mono">{item.time}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
