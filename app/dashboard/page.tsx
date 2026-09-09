"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";

type Summary = {
  open_exams_count: number;
  pending_grading_count: number;
  pending_release_count: number;
  total_classes: number;
  total_exams: number;
};

export default function DashboardHome() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/summary")
      .then((r) => r.ok ? r.json() : null)
      .then(setSummary);
  }, []);

  return (
    <DashboardShell>
      <h1 className="font-serif text-2xl font-bold text-rfcm-charcoal mb-6">Dashboard</h1>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link href="/dashboard/tests" className="bg-white rounded-xl border border-rfcm-yellow-soft p-4 hover:border-rfcm-red transition-colors">
            <p className="text-3xl font-bold text-rfcm-red">{summary.open_exams_count}</p>
            <p className="text-xs text-rfcm-charcoal/60 uppercase tracking-wide mt-1">Open exams</p>
          </Link>
          <Link href="/dashboard/grading" className="bg-white rounded-xl border border-rfcm-yellow-soft p-4 hover:border-rfcm-red transition-colors">
            <p className="text-3xl font-bold text-rfcm-red">{summary.pending_grading_count}</p>
            <p className="text-xs text-rfcm-charcoal/60 uppercase tracking-wide mt-1">Pending grading</p>
          </Link>
          <Link href="/dashboard/results" className="bg-white rounded-xl border border-rfcm-yellow-soft p-4 hover:border-rfcm-red transition-colors">
            <p className="text-3xl font-bold text-rfcm-red">{summary.pending_release_count}</p>
            <p className="text-xs text-rfcm-charcoal/60 uppercase tracking-wide mt-1">Pending release</p>
          </Link>
          <div className="bg-white rounded-xl border border-rfcm-yellow-soft p-4">
            <p className="text-3xl font-bold text-rfcm-red">{summary.total_classes}</p>
            <p className="text-xs text-rfcm-charcoal/60 uppercase tracking-wide mt-1">Classes / {summary.total_exams} exams</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/dashboard/tests" className="bg-white rounded-xl border border-rfcm-yellow-soft p-5 hover:border-rfcm-red transition-colors">
          <p className="font-semibold text-rfcm-charcoal">Tests</p>
          <p className="text-xs text-rfcm-charcoal/50 mt-1">Create and manage examinations</p>
        </Link>
        <Link href="/dashboard/grading" className="bg-white rounded-xl border border-rfcm-yellow-soft p-5 hover:border-rfcm-red transition-colors">
          <p className="font-semibold text-rfcm-charcoal">Grading</p>
          <p className="text-xs text-rfcm-charcoal/50 mt-1">Score essay answers</p>
        </Link>
        <Link href="/dashboard/results" className="bg-white rounded-xl border border-rfcm-yellow-soft p-5 hover:border-rfcm-red transition-colors">
          <p className="font-semibold text-rfcm-charcoal">Results</p>
          <p className="text-xs text-rfcm-charcoal/50 mt-1">Review and release scores</p>
        </Link>
        <Link href="/dashboard/admins" className="bg-white rounded-xl border border-rfcm-yellow-soft p-5 hover:border-rfcm-red transition-colors">
          <p className="font-semibold text-rfcm-charcoal">Admins &amp; Teachers</p>
          <p className="text-xs text-rfcm-charcoal/50 mt-1">Manage accounts</p>
        </Link>
      </div>
    </DashboardShell>
  );
}
