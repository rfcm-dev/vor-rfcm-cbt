"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type Question = { id: string; type: string; content: string; options: { id: string; text: string }[] | null };

function TakeExamInner() {
  const searchParams = useSearchParams();
  const testId = searchParams.get("test_id") ?? "";
  const studentId = searchParams.get("student_id") ?? "";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [online, setOnline] = useState(true);
  const [savedTick, setSavedTick] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function init() {
      const startRes = await fetch("/api/exam/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test_id: testId, student_id: studentId }),
      });
      const body = await startRes.json();
      if (body.error) return;

      setAttemptId(body.attempt.id);
      if (body.attempt.draft_answers) setAnswers(body.attempt.draft_answers);

      const elapsedSeconds = Math.floor((Date.now() - new Date(body.attempt.started_at).getTime()) / 1000);
      setSecondsLeft(Math.max(body.test.time_limit_minutes * 60 - elapsedSeconds, 0));

      const qRes = await fetch(`/api/questions?test_id=${body.test.id}`);
      setQuestions(await qRes.json());
    }
    if (testId && studentId) init();
  }, [testId, studentId]);

  useEffect(() => {
    const goOffline = () => setOnline(false);
    const goOnline = () => { setOnline(true); saveProgress(); };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, answers]);

  function saveProgress() {
    if (!attemptId) return;
    fetch("/api/exam/save-progress", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attempt_id: attemptId, draft_answers: answers }),
    }).then(() => {
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 1500);
    }).catch(() => {});
  }

  function setAnswer(questionId: string, value: string) {
    setAnswers((a) => ({ ...a, [questionId]: value }));
    localStorage.setItem(`rfcm-exam-${attemptId}`, JSON.stringify({ ...answers, [questionId]: value }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveProgress, 800);
  }

  function toggleMark(questionId: string) {
    setMarked((m) => {
      const next = new Set(m);
      next.has(questionId) ? next.delete(questionId) : next.add(questionId);
      return next;
    });
  }

  const submit = useMemo(
    () => async (autoSubmitted: boolean) => {
      if (!attemptId || submitted) return;
      setSubmitted(true);
      await fetch("/api/exam/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attempt_id: attemptId,
          auto_submitted: autoSubmitted,
          answers: Object.entries(answers).map(([question_id, response]) => ({ question_id, response })),
        }),
      });
    },
    [attemptId, answers, submitted]
  );

  useEffect(() => {
    if (secondsLeft === null || submitted) return;
    if (secondsLeft <= 0) { submit(true); return; }
    const t = setTimeout(() => setSecondsLeft((s) => (s ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, submit, submitted]);

  if (submitted) {
    return (
      <main className="min-h-screen bg-rfcm-cream flex items-center justify-center p-4 text-center">
        <div className="bg-white border border-rfcm-yellow-soft rounded-2xl shadow-sm p-10 max-w-sm">
          <div className="text-4xl mb-3">✅</div>
          <h1 className="font-serif text-xl font-bold mb-2">Examination submitted successfully</h1>
          <p className="text-sm text-rfcm-charcoal/70">
            Your result will be available when released by R.F.C.M. Use "Check My Result" from the home page later.
          </p>
        </div>
      </main>
    );
  }

  const q = questions[current];
  const answeredCount = Object.keys(answers).filter((id) => answers[id]?.trim()).length;
  const minutes = secondsLeft !== null ? Math.floor(secondsLeft / 60) : null;
  const seconds = secondsLeft !== null ? secondsLeft % 60 : null;
  const timeLow = secondsLeft !== null && secondsLeft <= 300;

  return (
    <main className="min-h-screen bg-rfcm-cream p-4 md:p-6">
      {!online && (
        <div className="bg-rfcm-red text-white text-sm text-center py-2 rounded-lg mb-4">
          ⚠ Connection interrupted — your answers are saved on this device. We're trying to reconnect...
        </div>
      )}

      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-6">
        <div className="flex-1 bg-white border border-rfcm-yellow-soft rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-rfcm-charcoal/50">
              {savedTick ? "✓ Saved" : "\u00A0"}
            </span>
            {secondsLeft !== null && (
              <span className={`font-semibold px-3 py-1 rounded-md ${timeLow ? "bg-rfcm-red text-white" : "bg-rfcm-yellow-soft text-rfcm-charcoal"}`}>
                {timeLow && "⚠ "}{minutes}:{String(seconds).padStart(2, "0")}
              </span>
            )}
          </div>

          {q && (
            <>
              <p className="font-medium mb-4">{current + 1}. {q.content}</p>

              {q.type === "mcq" && q.options?.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 mb-2 p-2 rounded-lg hover:bg-rfcm-cream-dark cursor-pointer">
                  <input type="radio" name={q.id} checked={answers[q.id] === opt.id}
                    onChange={() => setAnswer(q.id, opt.id)} />
                  {opt.text}
                </label>
              ))}

              {q.type === "true_false" && ["true", "false"].map((v) => (
                <label key={v} className="flex items-center gap-2 mb-2 p-2 rounded-lg hover:bg-rfcm-cream-dark cursor-pointer capitalize">
                  <input type="radio" name={q.id} checked={answers[q.id] === v}
                    onChange={() => setAnswer(q.id, v)} />
                  {v}
                </label>
              ))}

              {(q.type === "fill_blank" || q.type === "essay") && (
                <textarea
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red"
                  rows={q.type === "essay" ? 6 : 1}
                />
              )}

              <div className="flex items-center justify-between mt-6">
                <button onClick={() => toggleMark(q.id)}
                  className={`text-sm font-medium px-3 py-1.5 rounded-md ${marked.has(q.id) ? "bg-rfcm-yellow text-rfcm-charcoal" : "bg-rfcm-cream-dark text-rfcm-charcoal/70"}`}>
                  {marked.has(q.id) ? "🟡 Marked for review" : "Mark for review"}
                </button>
                <div className="flex gap-2">
                  <button disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}
                    className="px-4 py-1.5 rounded-md border border-rfcm-yellow-soft disabled:opacity-40">Back</button>
                  {current < questions.length - 1 ? (
                    <button onClick={() => setCurrent((c) => c + 1)}
                      className="px-4 py-1.5 rounded-md bg-rfcm-red text-white font-medium">Next</button>
                  ) : (
                    <button onClick={() => setShowReview(true)}
                      className="px-4 py-1.5 rounded-md bg-rfcm-red text-white font-medium">Review &amp; Submit</button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="w-full md:w-56 bg-white border border-rfcm-yellow-soft rounded-2xl shadow-sm p-4 h-fit">
          <p className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-3">Questions</p>
          <div className="grid grid-cols-5 md:grid-cols-4 gap-2">
            {questions.map((qq, i) => {
              const answered = !!answers[qq.id]?.trim();
              const isMarked = marked.has(qq.id);
              return (
                <button key={qq.id} onClick={() => setCurrent(i)}
                  className={`aspect-square rounded-md text-xs font-semibold flex items-center justify-center border
                    ${current === i ? "border-rfcm-red" : "border-transparent"}
                    ${isMarked ? "bg-rfcm-yellow" : answered ? "bg-rfcm-red text-white" : "bg-rfcm-cream-dark text-rfcm-charcoal/60"}`}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <button onClick={() => setShowReview(true)}
            className="w-full mt-4 rounded-md bg-rfcm-charcoal text-white text-sm font-medium py-2">
            Submit exam
          </button>
        </div>
      </div>

      {showReview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-10">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
            <h3 className="font-serif text-lg font-bold mb-2">Submit Exam?</h3>
            <p className="text-sm text-rfcm-charcoal/70 mb-4">
              You have answered <span className="font-semibold text-rfcm-red">{answeredCount} / {questions.length}</span> questions.
              {questions.length - answeredCount > 0 && (
                <> {questions.length - answeredCount} question(s) unanswered.</>
              )}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowReview(false)}
                className="flex-1 rounded-md border border-rfcm-yellow-soft py-2 font-medium">Go back</button>
              <button onClick={() => submit(false)}
                className="flex-1 rounded-md bg-rfcm-red text-white py-2 font-medium">Submit exam</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function TakeExamPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-rfcm-cream flex items-center justify-center"><div className="text-rfcm-charcoal/60">Loading exam...</div></main>}>
      <TakeExamInner />
    </Suspense>
  );
}
