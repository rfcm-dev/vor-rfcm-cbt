"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useToast } from "@/components/ToastProvider";

type PendingAnswer = {
  id: string;
  response: string;
  manual_score: number | null;
  questions: { content: string; points: number; test_id: string; tests: { title: string } };
  attempts: { students: { name: string } };
};

export default function GradingPage() {
  const { showToast } = useToast();
  const [testId, setTestId] = useState("");
  const [showGraded, setShowGraded] = useState(false);
  const [items, setItems] = useState<PendingAnswer[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    const params = new URLSearchParams();
    if (testId) params.set("test_id", testId);
    if (showGraded) params.set("all", "1");
    fetch(`/api/grading?${params}`)
      .then((r) => r.ok ? r.json() : [])
      .then(setItems)
      .catch(() => setItems([]));
  }

  useEffect(load, [testId, showGraded]);

  const grouped = items.reduce<Record<string, PendingAnswer[]>>((acc, item) => {
    const title = item.questions.tests?.title ?? "Unknown Exam";
    if (!acc[title]) acc[title] = [];
    acc[title].push(item);
    return acc;
  }, {});

  async function submitScore(answerId: string) {
    const manual_score = scores[answerId];
    if (typeof manual_score !== "number") return;
    setBusyId(answerId);
    const res = await fetch("/api/grading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer_id: answerId, manual_score }),
    });
    setBusyId(null);
    if (!res.ok) {
      showToast("Failed to save score", "error");
      return;
    }
    showToast("Score saved");
    load();
  }

  return (
    <DashboardShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold text-rfcm-charcoal">Manual grading</h1>
        <label className="flex items-center gap-2 text-sm text-rfcm-charcoal/70">
          <input type="checkbox" checked={showGraded} onChange={(e) => setShowGraded(e.target.checked)} />
          Show already-graded (override)
        </label>
      </div>

      <input value={testId} onChange={(e) => setTestId(e.target.value)} placeholder="Filter by test ID (optional)"
        className="w-full max-w-md mb-6 rounded-lg border border-rfcm-yellow-soft px-3 py-2" />

      {Object.entries(grouped).map(([examTitle, examItems]) => (
        <div key={examTitle} className="space-y-4">
          <h2 className="font-serif text-lg font-bold text-rfcm-charcoal">{examTitle}</h2>
          {examItems.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-rfcm-yellow-soft p-5 space-y-3">
              <p className="text-xs text-rfcm-charcoal/50">{item.attempts?.students?.name}</p>
              <p>{item.questions.content}</p>
              <p className="text-sm text-rfcm-charcoal/60 border-l-2 border-rfcm-yellow-soft pl-3">{item.response}</p>
              {item.manual_score !== null && (
                <p className="text-xs text-rfcm-red">Currently scored: {item.manual_score} / {item.questions.points}</p>
              )}
              <div className="flex items-center gap-3">
                <input type="number" min={0} max={item.questions.points}
                  defaultValue={item.manual_score ?? undefined}
                  className="w-20 rounded-lg border border-rfcm-yellow-soft px-2 py-1"
                  onChange={(e) => setScores((s) => ({ ...s, [item.id]: Number(e.target.value) }))} />
                <span className="text-sm text-rfcm-charcoal/60">/ {item.questions.points}</span>
                <button onClick={() => submitScore(item.id)} disabled={busyId === item.id} className="rounded-lg bg-rfcm-red text-white px-3 py-1.5 text-sm font-medium disabled:opacity-50">
                  {busyId === item.id ? "Saving..." : item.manual_score !== null ? "Update score" : "Save score"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </DashboardShell>
  );
}
