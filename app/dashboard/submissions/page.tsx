"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useToast } from "@/components/ToastProvider";

type TestSummary = { id: string; title: string };
type ClassRow = { id: string; name: string };
type AttemptRow = {
  id: string;
  test_id: string;
  student_id: string;
  student_name: string;
  class_name: string;
  test_title: string;
  started_at: string;
  submitted_at: string | null;
  status: 'in_progress' | 'stuck' | 'processing' | 'awaiting_grading' | 'ready_to_release' | 'released';
  isLate: boolean;
  lateMinutes: number;
  percentage: number | null;
  grade: string | null;
  canRelease: boolean;
  essaysGraded: number;
  essaysTotal: number;
};

export default function SubmissionsPage() {
  const { showToast } = useToast();
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retaking, setRetaking] = useState(false);

  const [testFilter, setTestFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetch("/api/tests")
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((d) => setTests(d.data ?? []))
      .catch(() => setTests([]));
    fetch("/api/classes")
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((d) => setClasses(d.data ?? []))
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
      .then((d) => setAttempts((Array.isArray(d) ? d : d.attempts ?? []).map((a: any) => ({
        ...a,
        status: a.status ?? "processing",
        percentage: a.percentage ?? null,
        grade: a.grade ?? null,
        isLate: a.isLate ?? false,
        lateMinutes: a.lateMinutes ?? 0,
        canRelease: a.canRelease ?? false,
        essaysGraded: a.essaysGraded ?? 0,
        essaysTotal: a.essaysTotal ?? 0,
      }))))
      .catch((e) => { setError(e.message); setAttempts([]); })
      .finally(() => setLoading(false));
  }, [testFilter, classFilter, statusFilter]);

  const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString() : "—";

  async function grantRetake(testId: string, studentId: string) {
    setError("");
    setRetaking(true);
    try {
      const res = await fetch("/api/retake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test_id: testId, student_id: studentId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || `Retake failed (${res.status})`;
        setError(msg);
        showToast(msg, "error");
        return;
      }
      showToast("Retake approved. The student can now retake this exam.", "success");
    } catch (e: any) {
      const msg = e.message || "Network error";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setRetaking(false);
    }
  }

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
              {loading && <tr key="loading"><td colSpan={7} className="px-4 py-3 text-rfcm-charcoal/60">Loading...</td></tr>}
              {!loading && attempts.length === 0 && <tr key="empty"><td colSpan={7} className="px-4 py-3 text-rfcm-charcoal/50">No submissions found.</td></tr>}
              {attempts.map((a, idx) => (
                <tr key={a.id} className={`border-t border-rfcm-yellow-soft ${mounted ? "animate-fade-in-up opacity-100 translate-y-0" : "opacity-0 translate-y-4"} stagger-${(idx % 6) + 1}`}>
                  <td className="px-4 py-2 font-medium">{a.student_name}</td>
                  <td className="px-4 py-2 text-rfcm-charcoal/70">{a.class_name || "—"}</td>
                  <td className="px-4 py-2">
                    <a href={`/dashboard/results?test_id=${a.test_id}`} className="text-rfcm-red hover:underline">{a.test_title}</a>
                  </td>
                  <td className="px-4 py-2 text-rfcm-charcoal/70">{fmt(a.submitted_at)}</td>
                  <td className="px-4 py-2">
                    <span className="text-xs font-medium">
                      {a.status === "in_progress" ? "In progress" : a.status === "stuck" ? "Stuck" : a.status === "processing" ? "Processing" : a.status === "awaiting_grading" ? "Awaiting grading" : a.status === "ready_to_release" ? "Ready to release" : a.status === "released" ? "Released" : a.status}
                    </span>
                    {a.isLate && <span className="text-xs text-rfcm-red ml-2">({a.lateMinutes}m late)</span>}
                  </td>
                  <td className="px-4 py-2 text-rfcm-charcoal/70">
                    {a.percentage !== null ? `${a.percentage}% · ${a.grade ?? "N/A"}` : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-2">
                      <a href={`/api/export/worksheet?attempt_id=${a.id}`} className="text-xs text-rfcm-red font-medium hover:underline">Worksheet</a>
                      {a.status === "released" && (
                        <a href={`/api/export/result?attempt_id=${a.id}`} className="text-xs text-rfcm-red font-medium hover:underline">Result PDF</a>
                      )}
                      {(a.status === "processing" || a.status === "awaiting_grading" || a.status === "ready_to_release" || a.status === "released") && (
                        <button
                          onClick={() => grantRetake(a.test_id, a.student_id)}
                          disabled={retaking}
                          className="text-xs text-rfcm-red font-medium hover:underline disabled:opacity-50">
                          {retaking ? "Approving..." : "Grant retake"}
                        </button>
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
