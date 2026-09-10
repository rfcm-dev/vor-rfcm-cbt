"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useToast } from "@/components/ToastProvider";

type Question = {
  id: string;
  type: string;
  content: string;
  points: number;
  created_by: string;
  users: { name: string } | null;
  tests: { title: string } | null;
};

type TestRow = { id: string; title: string };

const TYPES = [
  { value: "mcq", label: "Multiple Choice" },
  { value: "true_false", label: "True / False" },
  { value: "fill_blank", label: "Fill in the Blank" },
  { value: "essay", label: "Essay" },
];

export default function QuestionSubmissionsPage() {
  const { showToast } = useToast();
  const [tests, setTests] = useState<TestRow[]>([]);
  const [testId, setTestId] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);

  const [type, setType] = useState("mcq");
  const [content, setContent] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState("");
  const [points, setPoints] = useState(1);
  const [showMine, setShowMine] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/tests")
      .then((r) => r.ok ? r.json() : [])
      .then(setTests)
      .catch(() => setTests([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (showMine) params.set("mine", "1");
    fetch(`/api/questions/feed?${params}`)
      .then((r) => r.ok ? r.json() : [])
      .then(setQuestions)
      .catch(() => setQuestions([]));
  }, [showMine]);

  async function addQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!testId) return;
    setSubmitting(true);
    const body: any = { test_id: testId, type, content, points };
    if (type === "mcq") {
      body.options = options.filter((o) => o.trim()).map((text, i) => ({ id: String.fromCharCode(65 + i), text }));
      body.correct_answer = correct;
    } else if (type === "true_false") {
      body.correct_answer = correct;
    } else if (type === "fill_blank") {
      body.correct_answer = correct;
    }

    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    if (!res.ok) {
      showToast("Failed to add question", "error");
      return;
    }
    showToast("Question submitted");
    setContent("");
    setOptions(["", "", "", ""]);
    setCorrect("");
    setPoints(1);
    const params = new URLSearchParams();
    if (showMine) params.set("mine", "1");
    fetch(`/api/questions/feed?${params}`)
      .then((r) => r.ok ? r.json() : [])
      .then(setQuestions)
      .catch(() => setQuestions([]));
  }

  return (
    <DashboardShell>
      <h1 className="font-serif text-2xl font-bold text-rfcm-charcoal mb-6">Submit Questions</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-rfcm-yellow-soft p-5 space-y-3">
            <p className="font-semibold text-sm">Target examination</p>
            <select value={testId} onChange={(e) => setTestId(e.target.value)}
              className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2">
              <option value="">— Choose an exam —</option>
              {tests.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>

          {testId && (
            <form onSubmit={addQuestion} className="bg-white rounded-xl border border-rfcm-yellow-soft p-5 space-y-3">
              <p className="font-semibold text-sm">Add a question</p>
              <select value={type} onChange={(e) => setType(e.target.value)}
                className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2">
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Question text" required
                className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2" rows={2} />

              {type === "mcq" && (
                <div className="space-y-2">
                  {options.map((opt, i) => (
                    <input key={i} value={opt} placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      onChange={(e) => setOptions((o) => o.map((v, idx) => (idx === i ? e.target.value : v)))}
                      className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2" />
                  ))}
                  <select value={correct} onChange={(e) => setCorrect(e.target.value)} required
                    className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2">
                    <option value="">Correct option</option>
                    {options.map((_, i) => <option key={i} value={String.fromCharCode(65 + i)}>{String.fromCharCode(65 + i)}</option>)}
                  </select>
                </div>
              )}

              {type === "true_false" && (
                <select value={correct} onChange={(e) => setCorrect(e.target.value)} required
                  className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2">
                  <option value="">Correct answer</option>
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              )}

              {type === "fill_blank" && (
                <input value={correct} onChange={(e) => setCorrect(e.target.value)} placeholder="Correct answer" required
                  className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2" />
              )}

              <div className="flex items-center gap-2">
                <label className="text-xs text-rfcm-charcoal/60">Points</label>
                <input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))}
                  className="w-20 rounded-lg border border-rfcm-yellow-soft px-2 py-1" />
              </div>

              <button type="submit" disabled={submitting} className="rounded-lg bg-rfcm-red text-white font-medium px-4 py-2 disabled:opacity-50">
                {submitting ? "Submitting..." : "Submit question"}
              </button>
            </form>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm text-rfcm-charcoal/70">Recent submissions</p>
            <label className="flex items-center gap-2 text-sm text-rfcm-charcoal/70">
              <input type="checkbox" checked={showMine} onChange={(e) => setShowMine(e.target.checked)} />
              Show only mine
            </label>
          </div>
          {questions.map((q) => (
            <div key={q.id} className="bg-white rounded-lg border border-rfcm-yellow-soft p-3 text-sm">
              <p className="font-medium">{q.content}</p>
              <p className="text-xs text-rfcm-charcoal/50 mt-1">{q.type} · {q.points} pt(s)</p>
              <p className="text-xs text-rfcm-charcoal/40 mt-1">
                {q.tests?.title ?? "Unknown exam"} · by {q.users?.name ?? "Unknown"}
              </p>
            </div>
          ))}
          {questions.length === 0 && <p className="text-sm text-rfcm-charcoal/50">No questions submitted yet.</p>}
        </div>
      </div>
    </DashboardShell>
  );
}
