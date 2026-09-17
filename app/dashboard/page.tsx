"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import SkeletonCard from "@/components/SkeletonCard";

type Summary = {
  open_exams_count: number;
  pending_grading_count: number;
  pending_release_count: number;
  total_classes: number;
  total_exams: number;
};

const STATS = [
  { key: "open_exams_count", label: "Open exams", href: "/dashboard/tests", color: "text-rfcm-red", suffix: undefined as ((s: Summary) => string) | undefined },
  { key: "pending_grading_count", label: "Pending grading", href: "/dashboard/grading", color: "text-amber-600", suffix: undefined as ((s: Summary) => string) | undefined },
  { key: "pending_release_count", label: "Pending release", href: "/dashboard/results", color: "text-emerald-600", suffix: undefined as ((s: Summary) => string) | undefined },
  { key: "total_classes", label: "Classes", href: "/dashboard/classes", color: "text-blue-600", suffix: (s: Summary) => ` / ${s.total_exams} exams` },
] as const;

function statSuffix(stat: typeof STATS[number], summary: Summary | null): string {
  if (!summary) return "";
  if (stat.suffix) return stat.suffix(summary);
  return "";
}

const ACTIONS = [
  { href: "/dashboard/tests", label: "Examinations", description: "Create and manage exams" },
  { href: "/dashboard/grading", label: "Manual Grading", description: "Score essay answers" },
  { href: "/dashboard/results", label: "Results", description: "Review and release scores" },
  { href: "/dashboard/admins", label: "Admins & Teachers", description: "Manage accounts and permissions" },
];

export default function DashboardHome() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/summary")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        setSummary(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <DashboardShell>
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold text-rfcm-charcoal">Dashboard</h1>
        <p className="text-sm text-rfcm-charcoal/60 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {loading
          ? STATS.map((_, i) => <SkeletonCard key={i} />)
          : STATS.map((stat) => (
            <Link key={stat.key} href={stat.href} className="group bg-white rounded-2xl border border-rfcm-yellow-soft p-5 hover:border-rfcm-red hover:shadow-lg transition-all duration-200">
              <p className={`text-3xl font-bold ${stat.color} group-hover:scale-110 transition-transform duration-200 inline-block`}>
                {summary?.[stat.key as keyof Summary] ?? 0}
              </p>
              <p className="text-xs text-rfcm-charcoal/60 uppercase tracking-wide mt-1">
                {stat.label}{statSuffix(stat, summary)}
              </p>
            </Link>
          ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ACTIONS.map((action) => (
          <Link key={action.href} href={action.href} className="group bg-white rounded-2xl border border-rfcm-yellow-soft p-5 hover:border-rfcm-red hover:shadow-lg transition-all duration-200">
            <div className="w-10 h-10 rounded-xl bg-rfcm-cream-dark flex items-center justify-center mb-3 group-hover:bg-rfcm-red group-hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v2.25A2.25 2.25 0 006 10.5zm0 9.75h2.25A2.25 2.25 0 0010.5 18v-2.25a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25V18A2.25 2.25 0 06 20.25z" />
              </svg>
            </div>
            <p className="font-semibold text-rfcm-charcoal group-hover:text-rfcm-red transition-colors">{action.label}</p>
            <p className="text-xs text-rfcm-charcoal/50 mt-1">{action.description}</p>
          </Link>
        ))}
      </div>
    </DashboardShell>
  );
}
