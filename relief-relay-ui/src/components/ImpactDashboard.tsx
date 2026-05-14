"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

interface ImpactDashboardProps {
  totalCases: number;
}

const METRIC_BASE = [
  { id: "assisted", label: "People Assisted", color: "text-cyan-200", value: 127 },
  { id: "risk", label: "High-Risk Cases Identified", color: "text-amber-200", value: 34 },
  { id: "sheltered", label: "Families Sheltered", color: "text-blue-200", value: 18 },
  { id: "escalations", label: "Emergency Escalations", color: "text-rose-200", value: 9 },
] as const;

function Counter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const total = 550;
    const step = Math.max(1, Math.floor(value / 24));
    const interval = window.setInterval(() => {
      setDisplay((prev) => {
        if (prev >= value) {
          window.clearInterval(interval);
          return value;
        }
        return Math.min(value, prev + step);
      });
    }, Math.max(16, Math.floor(total / 24)));
    return () => window.clearInterval(interval);
  }, [value]);
  return <span>{display}</span>;
}

export function ImpactDashboard({ totalCases }: ImpactDashboardProps) {
  const metrics = useMemo(
    () =>
      METRIC_BASE.map((metric) =>
        metric.id === "assisted"
          ? { ...metric, value: metric.value + totalCases }
          : metric.id === "risk"
            ? { ...metric, value: metric.value + Math.floor(totalCases * 0.2) }
            : metric,
      ),
    [totalCases],
  );

  return (
    <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {metrics.map((metric, idx) => (
        <motion.div
          key={metric.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.06, type: "spring", stiffness: 180, damping: 20 }}
          className="glass-panel rounded-xl p-4"
        >
          <p className="text-[11px] uppercase tracking-[0.15em] text-gray-400">{metric.label}</p>
          <p className={`mt-2 text-2xl font-semibold ${metric.color}`}>
            <Counter value={metric.value} />
          </p>
        </motion.div>
      ))}
    </section>
  );
}
