"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { useToast } from "@/components/ToastProvider";

type ClassRow = { id: string; name: string };

export default function NewTestPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [title, setTitle] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [timeLimit, setTimeLimit] = useState(30);
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [examCode, setExamCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.ok ? r.json() : [])
      .then(setClasses)
      .catch(() => setClasses([]));
  }, []);

  function toggleClass(id: string) {
    setSelectedClassIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function selectAll() {
    setSelectedClassIds(classes.map((c) => c.id));
  }

  function clearAll() {
    setSelectedClassIds([]);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, class_ids: selectedClassIds, time_limit_minutes: timeLimit, exam_code: examCode, opens_at: opensAt || null, closes_at: closesAt || null }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Failed to create examination");
      return;
    }
    showToast("Examination created");
    const test = await res.json();
    router.push(`/dashboard/tests/${test.id}`);
  }

  return (
    <DashboardShell>
      <h1 className="font-serif text-2xl font-bold text-rfcm-charcoal mb-6">New examination</h1>
      <form onSubmit={handleCreate} className="max-w-md bg-white rounded-xl border border-rfcm-yellow-soft p-6 space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60">Exam name</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required
            className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red" />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60">Classes</label>
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={selectAll} className="text-xs px-2 py-1 rounded border border-rfcm-yellow-soft hover:bg-rfcm-cream-dark">Select all classes</button>
            <button type="button" onClick={clearAll} className="text-xs px-2 py-1 rounded border border-rfcm-yellow-soft hover:bg-rfcm-cream-dark">Clear</button>
          </div>
          <div className="max-h-48 overflow-y-auto border border-rfcm-yellow-soft rounded-lg p-2 space-y-1">
            {classes.length === 0 && (
              <p className="text-xs text-rfcm-charcoal/50">No classes yet — add one on the Classes page first.</p>
            )}
            {classes.map((c) => (
              <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={selectedClassIds.includes(c.id)} onChange={() => toggleClass(c.id)} className="rounded border-rfcm-yellow-soft accent-rfcm-red" />
                <span className="text-sm text-rfcm-charcoal">{c.name}</span>
              </label>
            ))}
          </div>
          {selectedClassIds.length === 0 && classes.length > 0 && (
            <p className="text-xs text-rfcm-red">Select at least one class</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60">Scheduled Date &amp; Time (optional)</label>
          <input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)}
            className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red" />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60">Duration (minutes)</label>
          <input type="number" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} required min="1"
            className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red" />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60">Exam code (optional — auto-generated if left blank)</label>
          <input value={examCode} onChange={(e) => setExamCode(e.target.value)} placeholder="RFCM-Q3-2026"
            className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red" />
        </div>

        {error && <p className="text-sm text-rfcm-red">{error}</p>}
        <button type="submit" disabled={loading} className="rounded-lg bg-rfcm-red text-white font-medium px-4 py-2 disabled:opacity-50">{loading ? "Creating..." : "Create examination"}</button>
      </form>
    </DashboardShell>
  );
}
