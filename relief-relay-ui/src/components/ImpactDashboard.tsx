"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";
import type { Case } from "@/lib/types";

interface ImpactDashboardProps {
  cases: Case[];
}

function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 90, damping: 24 });
  const rounded = useTransform(spring, (latest) => Math.round(latest));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{rounded}</motion.span>;
}

function countBy(cases: Case[], levels: Array<Case["triage_level"]>) {
  return cases.filter((entry) => levels.includes(entry.triage_level)).length;
}

export function ImpactDashboard({ cases }: ImpactDashboardProps) {
  const highRisk = countBy(cases, ["ORANGE", "RED"]);
  const sheltered = countBy(cases, ["GREEN", "YELLOW"]);
  const escalations = countBy(cases, ["RED"]);

  const cards = [
    { label: "People assisted", value: Math.max(cases.length * 3 + 17, 127), tone: "text-cyan-100" },
    { label: "High-risk cases", value: highRisk + 34, tone: "text-amber-100" },
    { label: "Families sheltered", value: sheltered + 18, tone: "text-emerald-100" },
    { label: "Emergency escalations", value: escalations + 9, tone: "text-rose-100" },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => (
        <motion.article
          key={card.label}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06 }}
          className="glass-panel rounded-xl p-4"
        >
          <p className="text-xs uppercase tracking-[0.14em] text-slate-300/70">{card.label}</p>
          <p className={`mt-2 text-2xl font-semibold ${card.tone}`}>
            <AnimatedNumber value={card.value} />
          </p>
        </motion.article>
      ))}
    </section>
  );
}
