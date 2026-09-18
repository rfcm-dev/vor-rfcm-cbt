"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { useToast } from "@/components/ToastProvider";

type TestSummary = { id: string; title: string; status: string; opens_at: string | null; closes_at: string | null; time_limit_minutes: number; submitted_count: number; pending_grading_count: number; ready_to_release_count: number };
type AttemptRow = { id: string; test_id: string; student_id: string; student_name: string; started_at: string; submitted_at: string | null; status: string; late_seconds: number; result: { total_score: number | null; status: string } | null };
type AdminResult = { attempt_id: string; result_id: string; student_id: string; student_name: string; class_id: string; class_name: string; test_id: string; test_title: string; total_score: number | null; total_possible: number; percentage: number; grade: string; status: string; released_at: string | null; submitted_at: string | null };
type ClassRow = { id: string; name: string };

type Tab = "by_exam" | "leaderboard";

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto text-center py-20"><p className="text-sm text-rfcm-charcoal/60">Loading results...</p></div>}>
      <ResultsContent />
    </Suspense>
  );
}

function ResultsContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [tab, setTab] = useState<Tab>("by_exam");
  const [selectedTestId, setSelectedTestId] = useState("");
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [releasing, setReleasing] = useState(false);
  const [retaking, setRetaking] = useState(false);

  const [leaderboardResults, setLeaderboardResults] = useState<AdminResult[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardClassFilter, setLeaderboardClassFilter] = useState("");
  const [leaderboardTestFilter, setLeaderboardTestFilter] = useState("");
  const [leaderboardSort, setLeaderboardSort] = useState<"score_desc" | "score_asc" | "name_asc">("score_desc");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const testId = searchParams.get("test_id");
    if (testId) setSelectedTestId(testId);
  }, [searchParams]);

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
    if (tab !== "by_exam") return;
    if (!selectedTestId) {
      setAttempts([]);
      return;
    }
    setLoading(true);
    setError("");
    setSelected([]);
    fetch(`/api/attempts/all?test_id=${selectedTestId}`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`Failed to load attempts (${r.status})`)))
      .then((data) => setAttempts(Array.isArray(data) ? data : data.attempts ?? []))
      .catch((e) => { setError(e.message); setAttempts([]); })
      .finally(() => setLoading(false));
  }, [tab, selectedTestId]);

  useEffect(() => {
    if (tab !== "leaderboard") return;
    setLeaderboardLoading(true);
    const params = new URLSearchParams();
    if (leaderboardClassFilter) params.set("class_id", leaderboardClassFilter);
    if (leaderboardTestFilter) params.set("test_id", leaderboardTestFilter);
    params.set("status", "released");
    fetch(`/api/admin/results?${params}`)
      .then((r) => r.ok ? r.json() : { results: [] })
      .then((data) => setLeaderboardResults(data.results ?? []))
      .catch(() => setLeaderboardResults([]))
      .finally(() => setLeaderboardLoading(false));
  }, [tab, leaderboardClassFilter, leaderboardTestFilter]);

  const sortedLeaderboard = [...leaderboardResults].sort((a, b) => {
    if (leaderboardSort === "score_desc") return (b.percentage ?? 0) - (a.percentage ?? 0);
    if (leaderboardSort === "score_asc") return (a.percentage ?? 0) - (b.percentage ?? 0);
    return a.student_name.localeCompare(b.student_name);
  });

  async function release() {
    setError("");
    setReleasing(true);
    try {
      const res = await fetch("/api/results/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attempt_ids: selected }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || `Release failed (${res.status})`;
        setError(msg);
        showToast(msg, "error");
        return;
      }
      if (data.released > 0 && data.skipped_already_released > 0) {
        const msg = `Released ${data.released} result(s). ${data.skipped_already_released} was/were already released.`;
        setError(msg);
        showToast(msg, "success");
      } else if (data.released === 0 && data.skipped_already_released > 0) {
        const msg = `${data.skipped_already_released} selected result(s) were already released — nothing new to release.`;
        setError(msg);
        showToast(msg, "error");
      } else if (data.message) {
        const msg = data.message;
        setError(msg);
        showToast(msg, "error");
      } else if (data.released > 0) {
        showToast(`Released ${data.released} result(s) successfully`, "success");
      }
      setSelected([]);
      if (selectedTestId) {
        const r = await fetch(`/api/tests/${selectedTestId}/attempts`);
        if (r.ok) {
          const d = await r.json();
          setAttempts(d.attempts ?? []);
        }
      }
    } catch (e: any) {
      const msg = e.message || "Network error";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setReleasing(false);
    }
  }

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

  const selectedTest = tests.find((t) => t.id === selectedTestId);
  const gradable = attempts.filter((a) => a.result?.status === "graded");

  return (
    <DashboardShell>
      <h1 className="font-serif text-2xl font-bold text-rfcm-charcoal mb-6">Results</h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("by_exam")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === "by_exam" ? "bg-rfcm-red text-white" : "bg-white border border-rfcm-yellow-soft text-rfcm-charcoal"}`}
        >
          By Examination
        </button>
        <button
          onClick={() => setTab("leaderboard")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === "leaderboard" ? "bg-rfcm-red text-white" : "bg-white border border-rfcm-yellow-soft text-rfcm-charcoal"}`}
        >
          All Results (Leaderboard)
        </button>
      </div>

      {tab === "by_exam" && (
        <>
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
            {!loading && attempts.map((a, idx) => (
              <div key={a.id} className={`flex items-center gap-3 bg-white rounded-lg border border-rfcm-yellow-soft p-3 ${mounted ? "animate-fade-in-up opacity-100 translate-y-0" : "opacity-0 translate-y-4"} stagger-${idx + 1}`}>
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
                {(a.status === "submitted" || a.status === "auto_submitted") && (
                  <button
                    onClick={() => grantRetake(a.test_id, a.student_id)}
                    disabled={retaking}
                    className="text-xs text-rfcm-red font-medium hover:underline px-3 py-1.5 rounded-md hover:bg-rfcm-red/5 transition-colors disabled:opacity-50">
                    {retaking ? "Approving..." : "Grant retake"}
                  </button>
                )}
              </div>
            ))}
            {!loading && attempts.length === 0 && selectedTestId && (
              <p className="text-sm text-rfcm-charcoal/50">No attempts found for this test yet.</p>
            )}
          </div>

          {selected.length > 0 && (
            <button onClick={release} disabled={releasing} className="mt-6 rounded-lg bg-rfcm-red text-white font-medium px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {releasing ? "Releasing..." : `Release ${selected.length} result(s)`}
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
        </>
      )}

      {tab === "leaderboard" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">Filter by class</label>
              <select value={leaderboardClassFilter} onChange={(e) => setLeaderboardClassFilter(e.target.value)}
                className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2">
                <option value="">All classes</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">Filter by examination</label>
              <select value={leaderboardTestFilter} onChange={(e) => setLeaderboardTestFilter(e.target.value)}
                className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2">
                <option value="">All examinations</option>
                {tests.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">Sort by</label>
              <select value={leaderboardSort} onChange={(e) => setLeaderboardSort(e.target.value as any)}
                className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2">
                <option value="score_desc">Score (high to low)</option>
                <option value="score_asc">Score (low to high)</option>
                <option value="name_asc">Name (A-Z)</option>
              </select>
            </div>
          </div>

          {leaderboardLoading && <p className="text-sm text-rfcm-charcoal/60 mb-4">Loading leaderboard...</p>}

          <div className="bg-white rounded-xl border border-rfcm-yellow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-rfcm-charcoal/5">
                  <tr>
                    <th className="text-left px-4 py-2">Rank</th>
                    <th className="text-left px-4 py-2">Student</th>
                    <th className="text-left px-4 py-2">Class</th>
                    <th className="text-left px-4 py-2">Examination</th>
                    <th className="text-left px-4 py-2">Score</th>
                    <th className="text-left px-4 py-2">Percentage</th>
                    <th className="text-left px-4 py-2">Grade</th>
                    <th className="text-left px-4 py-2">Status</th>
                    <th className="text-left px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!leaderboardLoading && sortedLeaderboard.length === 0 && (
                    <tr key="empty"><td colSpan={9} className="px-4 py-3 text-rfcm-charcoal/50">No released results found.</td></tr>
                  )}
                  {sortedLeaderboard.map((r, idx) => (
                    <tr key={r.attempt_id} className={`border-t border-rfcm-yellow-soft ${mounted ? "animate-fade-in-up opacity-100 translate-y-0" : "opacity-0 translate-y-4"} stagger-${(idx % 6) + 1}`}>
                      <td className="px-4 py-2 font-medium">{idx + 1}</td>
                      <td className="px-4 py-2 font-medium">{r.student_name}</td>
                      <td className="px-4 py-2 text-rfcm-charcoal/70">{r.class_name}</td>
                      <td className="px-4 py-2">
                        <a href={`/dashboard/results?test_id=${r.test_id}`} className="text-rfcm-red hover:underline" onClick={() => setTab("by_exam")}>
                          {r.test_title}
                        </a>
                      </td>
                      <td className="px-4 py-2 text-rfcm-charcoal/70">{r.total_score ?? "—"} / {r.total_possible}</td>
                      <td className="px-4 py-2 text-rfcm-charcoal/70">{r.percentage}%</td>
                      <td className="px-4 py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${r.grade === "A" ? "bg-green-100 text-green-700" : r.grade === "F" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {r.grade}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-xs font-medium capitalize">{r.status}</span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          <a href={`/api/export/result?attempt_id=${r.attempt_id}`} className="text-xs text-rfcm-red font-medium hover:underline">Result PDF</a>
                          <button
                            onClick={() => grantRetake(r.test_id, r.student_id)}
                            disabled={retaking}
                            className="text-xs text-rfcm-red font-medium hover:underline disabled:opacity-50">
                            {retaking ? "Approving..." : "Grant retake"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
