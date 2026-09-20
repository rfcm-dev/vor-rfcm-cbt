"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useToast } from "@/components/ToastProvider";

type PendingAnswer = {
  id: string;
  response: string;
  manual_score: number | null;
  rubric_scores: any[] | null;
  questions: { content: string; points: number; rubric: any[] | null; test_id: string; tests: { title: string } };
  attempts: { students: { name: string } };
};

export default function GradingPage() {
  const { showToast } = useToast();
  const [testId, setTestId] = useState("");
  const [showGraded, setShowGraded] = useState(false);
  const [items, setItems] = useState<PendingAnswer[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function load() {
    const params = new URLSearchParams();
    if (testId) params.set("test_id", testId);
    if (showGraded) params.set("all", "1");
    fetch(`/api/grading?${params}`)
      .then((r) => r.ok ? r.json() : [])
      .then((items) => setItems((items ?? []).map((item: any) => ({
        ...item,
        attempt_view: item.attempt_view ?? null,
      }))))
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
    const item = items.find((i) => i.id === answerId);
    if (!item) return;
    setBusyId(answerId);

    let payload: any = { answer_id: answerId };
    if (item.questions.rubric && item.questions.rubric.length > 0) {
      payload.rubric_scores = item.questions.rubric.map((criterion: any) => ({
        criterion_id: criterion.id,
        score: scores[`${answerId}-${criterion.id}`] ?? 0,
      }));
    } else {
      const manual_score = scores[answerId];
      if (typeof manual_score !== "number") {
        setBusyId(null);
        return;
      }
      payload.manual_score = manual_score;
    }

    const res = await fetch("/api/grading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusyId(null);
    if (!res.ok) {
      showToast("Failed to save score", "error");
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (data.updated) {
      showToast("Score saved — result is now graded and ready to release", "success");
    } else if (data.stillPending) {
      showToast("Score saved — still waiting for other essay answers", "success");
    } else {
      showToast("Score saved", "success");
    }
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
          {examItems.map((item, idx) => (
            <div key={item.id} className={`bg-white rounded-xl border border-rfcm-yellow-soft p-5 space-y-3 ${mounted ? "animate-fade-in-up opacity-100 translate-y-0" : "opacity-0 translate-y-4"} stagger-${(idx % 6) + 1}`}>
              <p className="text-xs text-rfcm-charcoal/50">{item.attempts?.students?.name}</p>
              <p>{item.questions.content}</p>
              <p className="text-sm text-rfcm-charcoal/60 border-l-2 border-rfcm-yellow-soft pl-3">{item.response}</p>
              <p className="text-sm text-rfcm-charcoal/60 border-l-2 border-rfcm-yellow-soft pl-3">{item.response}</p>
              {item.manual_score !== null && (
                <p className="text-xs text-rfcm-red">Currently scored: {item.manual_score} / {item.questions.points}</p>
              )}
              {item.questions.rubric && item.questions.rubric.length > 0 && (
                <div className="space-y-2">
                  {item.questions.rubric.map((criterion: any) => {
                    const existingScore = item.rubric_scores?.find((s: any) => s.criterion_id === criterion.id);
                    return (
                      <div key={criterion.id} className="flex items-center gap-3">
                        <span className="text-sm text-rfcm-charcoal/70 flex-1">{criterion.label}</span>
                        <input type="number" min={0} max={criterion.max_points}
                          defaultValue={existingScore?.score ?? 0}
                          className="w-20 rounded-lg border border-rfcm-yellow-soft px-2 py-1"
                          onChange={(e) => setScores((s) => ({ ...s, [`${item.id}-${criterion.id}`]: Number(e.target.value) }))} />
                        <span className="text-sm text-rfcm-charcoal/60">/ {criterion.max_points}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {(!item.questions.rubric || item.questions.rubric.length === 0) && (
                <div className="flex items-center gap-3">
                  <input type="number" min={0} max={item.questions.points}
                    defaultValue={item.manual_score ?? undefined}
                    className="w-20 rounded-lg border border-rfcm-yellow-soft px-2 py-1"
                    onChange={(e) => setScores((s) => ({ ...s, [item.id]: Number(e.target.value) }))} />
                  <span className="text-sm text-rfcm-charcoal/60">/ {item.questions.points}</span>
                </div>
              )}
              <button onClick={() => submitScore(item.id)} disabled={busyId === item.id} className="rounded-lg bg-rfcm-red text-white px-3 py-1.5 text-sm font-medium disabled:opacity-50">
                {busyId === item.id ? "Saving..." : item.manual_score !== null ? "Update score" : "Save score"}
              </button>
            </div>
          ))}
        </div>
      ))}
    </DashboardShell>
  );
}
