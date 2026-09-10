"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useToast } from "@/components/ToastProvider";

type StuckAttempt = {
  id: string;
  test_id: string;
  test_title: string;
  time_limit_minutes: number;
  total_questions: number;
  student_id: string;
  student_name: string;
  class_name: string;
  started_at: string;
  draft_answers: Record<string, string>;
  answered_count: number;
};

type ConfirmState = { attemptId: string; action: "finalize" | "retake"; studentName: string; answeredCount: number } | null;

export default function StuckAttemptsPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<StuckAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/attempts/stuck")
      .then((r) => r.ok ? r.json() : [])
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleAction() {
    if (!confirm) return;
    setBusyId(confirm.attemptId);
    const res = await fetch("/api/attempts/stuck", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attempt_id: confirm.attemptId, action: confirm.action }),
    });
    setBusyId(null);
    if (!res.ok) {
      showToast("Action failed", "error");
      return;
    }
    showToast(confirm.action === "finalize" ? "Attempt finalized" : "Retake granted");
    setConfirm(null);
    load();
  }

  return (
    <DashboardShell>
      <h1 className="font-serif text-2xl font-bold text-rfcm-charcoal mb-6">Stuck attempts</h1>
      <p className="text-sm text-rfcm-charcoal/60 mb-4">Exams that were started but never submitted, with last autosaved answers available.</p>

      {loading && <p className="text-sm text-rfcm-charcoal/60">Loading...</p>}

      <div className="max-w-3xl space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-rfcm-yellow-soft p-4 md:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
              <div>
                <p className="font-medium">{item.student_name}</p>
                <p className="text-xs text-rfcm-charcoal/50">{item.class_name} · {item.test_title}</p>
                <p className="text-xs text-rfcm-charcoal/50">Started: {new Date(item.started_at).toLocaleString()}</p>
                <p className="text-xs text-rfcm-red mt-1">{item.answered_count} of {item.total_questions} questions answered before disconnecting</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setConfirm({ attemptId: item.id, action: "finalize", studentName: item.student_name, answeredCount: item.answered_count })}
                disabled={item.answered_count === 0 || busyId === item.id}
                className="rounded-lg bg-rfcm-charcoal text-white text-sm font-medium px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title={item.answered_count === 0 ? "No answers saved to finalize" : undefined}>
                {busyId === item.id ? "Processing..." : "Finalize with last saved answers"}
              </button>
              <button
                onClick={() => setConfirm({ attemptId: item.id, action: "retake", studentName: item.student_name, answeredCount: item.answered_count })}
                disabled={busyId === item.id}
                className="rounded-lg border border-rfcm-yellow-soft text-sm font-medium px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {busyId === item.id ? "Processing..." : "Grant a retake instead"}
              </button>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && (
          <p className="text-sm text-rfcm-charcoal/50">No stuck attempts right now.</p>
        )}
      </div>

      {confirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-10">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
            <h3 className="font-serif text-lg font-bold mb-2">
              {confirm.action === "finalize" ? "Finalize this exam?" : "Grant a retake?"}
            </h3>
            <p className="text-sm text-rfcm-charcoal/70 mb-4">
              {confirm.action === "finalize"
                ? `This will score ${confirm.studentName}'s exam using their last autosaved answers (${confirm.answeredCount} questions). This cannot be undone.`
                : `This will allow ${confirm.studentName} to retake this exam. The original incomplete attempt will remain as a record.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="flex-1 rounded-md border border-rfcm-yellow-soft py-2 font-medium">Cancel</button>
              <button onClick={handleAction} disabled={busyId === confirm.attemptId} className="flex-1 rounded-md bg-rfcm-red text-white py-2 font-medium disabled:opacity-50">
                {busyId === confirm.attemptId ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
