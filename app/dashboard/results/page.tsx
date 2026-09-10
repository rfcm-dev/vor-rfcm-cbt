"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";

type TestSummary = { id: string; title: string; status: string; opens_at: string | null; closes_at: string | null; time_limit_minutes: number; submitted_count: number; pending_grading_count: number; ready_to_release_count: number };
type AttemptRow = { id: string; student_name: string; started_at: string; submitted_at: string | null; status: string; late_seconds: number; result: { total_score: number | null; status: string } | null };

export default function ResultsPage() {
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [selectedTestId, setSelectedTestId] = useState("");
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/tests")
      .then((r) => r.ok ? r.json() : [])
      .then(setTests)
      .catch(() => setTests([]));
  }, []);

  useEffect(() => {
    if (!selectedTestId) {
      setAttempts([]);
      return;
    }
    setLoading(true);
    setError("");
    setSelected([]);
    fetch(`/api/tests/${selectedTestId}/attempts`)
      .then((r) => r.ok ? r.json() : { attempts: [] })
      .then((data) => setAttempts(data.attempts ?? []))
      .catch((e) => { setError(e.message); setAttempts([]); })
      .finally(() => setLoading(false));
  }, [selectedTestId]);

  async function release() {
    setError("");
    const res = await fetch("/api/results/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attempt_ids: selected }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || `Release failed (${res.status})`);
      return;
    }
    if (data.released === 0) {
      setError("No results were released — they may not be in graded status.");
      return;
    }
    setSelected([]);
    if (selectedTestId) {
      const r = await fetch(`/api/tests/${selectedTestId}/attempts`);
      if (r.ok) {
        const d = await r.json();
        setAttempts(d.attempts ?? []);
      }
    }
  }

  const selectedTest = tests.find((t) => t.id === selectedTestId);
  const gradable = attempts.filter((a) => a.result?.status === "graded");

  return (
    <DashboardShell>
      <h1 className="font-serif text-2xl font-bold text-rfcm-charcoal mb-6">Results</h1>

      <div className="max-w-2xl mb-6">
        <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">Select examination</label>
        <select value={selectedTestId} onChange={(e) => setSelectedTestId(e.target.value)}
          className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2">
          <option value="">— Choose a test —</option>
          {tests.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title} ({t.status}) — {t.submitted_count} submitted, {t.pending_grading_count} pending grading, {t.ready_to_release_count} ready to release
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-rfcm-red mb-4">{error}</p>}

      <div className="max-w-2xl space-y-2">
        {loading && <p className="text-sm text-rfcm-charcoal/60">Loading attempts...</p>}
        {!loading && attempts.map((a) => (
          <div key={a.id} className="flex items-center gap-3 bg-white rounded-lg border border-rfcm-yellow-soft p-3">
            <span className="flex-1">
              <span className="font-medium">{a.student_name}</span>
              <span className="text-xs text-rfcm-charcoal/50 ml-2">
                {a.status === "in_progress" ? "In progress" : a.status === "submitted" || a.status === "auto_submitted" ? (a.result ? "Processing" : "Submitted — processing") : a.status}
              </span>
              {a.late_seconds > 0 && (
                <span className="text-xs text-rfcm-red ml-2">Submitted {Math.round(a.late_seconds / 60)}m late</span>
              )}
            </span>
            <span className="text-sm text-rfcm-charcoal/60">
              {a.result ? `${a.result.total_score ?? "pending"} pts · ${a.result.status}` : "No result yet"}
            </span>
            {a.result?.status === "released" && (
              <a href={`/api/export/result?attempt_id=${a.id}`} className="text-xs text-rfcm-red font-medium hover:underline">Result PDF</a>
            )}
            {a.result?.status === "graded" && (
              <label className="flex items-center gap-2">
                <input type="checkbox" onChange={(e) => setSelected((s) => (e.target.checked ? [...s, a.id] : s.filter((id) => id !== a.id)))} />
                <span className="text-xs text-rfcm-charcoal/60">Release</span>
              </label>
            )}
          </div>
        ))}
        {!loading && attempts.length === 0 && selectedTestId && (
          <p className="text-sm text-rfcm-charcoal/50">No attempts found for this test yet.</p>
        )}
      </div>

      {selected.length > 0 && (
        <button onClick={release} className="mt-6 rounded-lg bg-rfcm-red text-white font-medium px-4 py-2">
          Release {selected.length} result(s)
        </button>
      )}

      {selectedTestId && (
        <div className="mt-8 flex gap-3">
          <a href={`/api/export/bulk?test_id=${selectedTestId}&type=worksheet`}
            className="rounded-lg border border-rfcm-charcoal text-rfcm-charcoal px-4 py-2 text-sm font-medium">
            Download all worksheets (zip)
          </a>
          <a href={`/api/export/bulk?test_id=${selectedTestId}&type=result`}
            className="rounded-lg border border-rfcm-charcoal text-rfcm-charcoal px-4 py-2 text-sm font-medium">
            Download released results (zip)
          </a>
        </div>
      )}
    </DashboardShell>
  );
}
