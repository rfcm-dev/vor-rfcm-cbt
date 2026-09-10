"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";

type TestSummary = { id: string; title: string };
type ClassRow = { id: string; name: string };
type AttemptRow = {
  id: string;
  student_name: string;
  class_name: string;
  test_title: string;
  started_at: string;
  submitted_at: string;
  status: string;
  late_seconds: number;
  result: { total_score: number | null; status: string } | null;
};

export default function SubmissionsPage() {
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [testFilter, setTestFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetch("/api/tests")
      .then((r) => r.ok ? r.json() : [])
      .then(setTests)
      .catch(() => setTests([]));
    fetch("/api/classes")
      .then((r) => r.ok ? r.json() : [])
      .then(setClasses)
      .catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (testFilter) params.set("test_id", testFilter);
    if (classFilter) params.set("class_id", classFilter);
    if (statusFilter) params.set("status", statusFilter);
    fetch(`/api/attempts/all?${params}`)
      .then((r) => r.ok ? r.json() : [])
      .then(setAttempts)
      .catch((e) => { setError(e.message); setAttempts([]); })
      .finally(() => setLoading(false));
  }, [testFilter, classFilter, statusFilter]);

  const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString() : "—";

  return (
    <DashboardShell>
      <h1 className="font-serif text-2xl font-bold text-rfcm-charcoal mb-6">Submissions</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">Exam</label>
          <select value={testFilter} onChange={(e) => setTestFilter(e.target.value)}
            className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2">
            <option value="">All exams</option>
            {tests.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">Class</label>
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
            className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2">
            <option value="">All classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">Result status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2">
            <option value="">All statuses</option>
            <option value="pending_grading">Pending grading</option>
            <option value="graded">Graded</option>
            <option value="released">Released</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-rfcm-red mb-4">{error}</p>}

      <div className="bg-white rounded-xl border border-rfcm-yellow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-rfcm-charcoal/5">
              <tr>
                <th className="text-left px-4 py-2">Student</th>
                <th className="text-left px-4 py-2">Class</th>
                <th className="text-left px-4 py-2">Exam</th>
                <th className="text-left px-4 py-2">Submitted</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Score</th>
                <th className="text-left px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="px-4 py-3 text-rfcm-charcoal/60">Loading...</td></tr>}
              {!loading && attempts.length === 0 && <tr><td colSpan={7} className="px-4 py-3 text-rfcm-charcoal/50">No submissions found.</td></tr>}
              {attempts.map((a) => (
                <tr key={a.id} className="border-t border-rfcm-yellow-soft">
                  <td className="px-4 py-2 font-medium">{a.student_name}</td>
                  <td className="px-4 py-2 text-rfcm-charcoal/70">{a.class_name || "—"}</td>
                  <td className="px-4 py-2">
                    <a href={`/dashboard/results?test_id=${a.test_title}`} className="text-rfcm-red hover:underline">{a.test_title}</a>
                  </td>
                  <td className="px-4 py-2 text-rfcm-charcoal/70">{fmt(a.submitted_at)}</td>
                  <td className="px-4 py-2">
                    <span className="text-xs font-medium">
                      {a.result?.status ?? "pending"}
                    </span>
                    {a.late_seconds > 0 && <span className="text-xs text-rfcm-red ml-2">({Math.round(a.late_seconds / 60)}m late)</span>}
                  </td>
                  <td className="px-4 py-2 text-rfcm-charcoal/70">{a.result?.total_score ?? "—"}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-2">
                      <a href={`/api/export/worksheet?attempt_id=${a.id}`} className="text-xs text-rfcm-red font-medium hover:underline">Worksheet</a>
                      {a.result?.status === "released" && (
                        <a href={`/api/export/result?attempt_id=${a.id}`} className="text-xs text-rfcm-red font-medium hover:underline">Result PDF</a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
