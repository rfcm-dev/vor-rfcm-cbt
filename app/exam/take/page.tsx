"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type Question = { id: string; type: string; content: string; options: { id: string; text: string }[] | null };
type Section = { id: string; title: string; time_limit_minutes: number; question_ids: string[] };

function TakeExamInner() {
  const searchParams = useSearchParams();
  const testId = searchParams.get("test_id") ?? "";
  const studentId = searchParams.get("student_id") ?? "";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState(0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [online, setOnline] = useState(true);
  const [savedTick, setSavedTick] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [initError, setInitError] = useState("");
  const [sectionDeadline, setSectionDeadline] = useState<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittingRef = useRef(false);

  const currentSection = sections[currentSectionIndex] ?? null;
  const sectionQuestionIds = currentSection?.question_ids ?? questions.map((q) => q.id);
  const sectionQuestions = questions.filter((q) => sectionQuestionIds.includes(q.id));
  const sectionAnsweredCount = sectionQuestions.filter((q) => answers[q.id]?.trim()).length;

  useEffect(() => {
    if (!testId || !studentId) {
      setInitError("Missing required information");
      setInitializing(false);
      return;
    }
    async function init() {
      setInitializing(true);
      setInitError("");
      try {
        const startRes = await fetch("/api/exam/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ test_id: testId, student_id: studentId }),
        });
        const body = await startRes.json();
        if (body.error) {
          setInitError(body.error);
          setInitializing(false);
          return;
        }

        setAttemptId(body.attempt.id);
        if (body.attempt.draft_answers) setAnswers(body.attempt.draft_answers);

        const sectionsData = body.test.sections && Array.isArray(body.test.sections) ? body.test.sections : [];
        setSections(sectionsData);

        const startedAt = new Date(body.attempt.started_at).getTime();
        if (sectionsData.length > 0 && sectionsData[0]) {
          const sectionDeadlineMs = startedAt + sectionsData[0].time_limit_minutes * 60 * 1000;
          setSectionDeadline(sectionDeadlineMs);
          setSecondsLeft(Math.max(0, (sectionDeadlineMs - Date.now()) / 1000));
        } else {
          const absoluteDeadline = startedAt + body.test.time_limit_minutes * 60 * 1000;
          setDeadline(absoluteDeadline);
          setSecondsLeft(Math.max(0, (absoluteDeadline - Date.now()) / 1000));
        }

        if (sectionsData.length > 0) {
          setCurrentSectionIndex(0);
        }

        const qRes = await fetch(`/api/questions?test_id=${body.test.id}&seed=${body.attempt.randomization_seed}&randomize_questions=${body.test.randomize_questions ? "1" : "0"}&randomize_options=${body.test.randomize_options ? "1" : "0"}`);
        const qData = await qRes.json();
        setQuestions(qData);
      } catch (e: any) {
        setInitError(e.message ?? "Failed to load exam");
      } finally {
        setInitializing(false);
      }
    }
    init();
  }, [testId, studentId]);

  useEffect(() => {
    const goOffline = () => setOnline(false);
    const goOnline = () => { setOnline(true); saveProgress(); };
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && deadline) {
        setSecondsLeft(Math.max(0, (deadline - Date.now()) / 1000));
      }
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    window.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("visibilitychange", handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, answers, deadline]);

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
      if (!attemptId || submitted || submittingRef.current) return;
      submittingRef.current = true;
      try {
        const activeQuestions = sections.length > 0 ? sectionQuestions : questions;
        const payload = {
          attempt_id: attemptId,
          auto_submitted: autoSubmitted,
          answers: Object.entries(answers)
            .filter(([question_id]) => activeQuestions.some((q) => q.id === question_id))
            .map(([question_id, response]) => ({ question_id, response })),
        };

        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const res = await fetch("/api/exam/submit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            if (res.ok) {
              setSubmitted(true);
              return;
            }

            if (attempt < maxRetries) {
              await new Promise((r) => setTimeout(r, 1000 * attempt));
            }
          } catch {
            if (attempt < maxRetries) {
              await new Promise((r) => setTimeout(r, 1000 * attempt));
            }
          }
        }

        setSubmitError("Something went wrong submitting your exam. Your answers are saved on this device. Please tell your admin your exam did not submit, and try refreshing this page.");
      } finally {
        submittingRef.current = false;
      }
    },
    [attemptId, answers, submitted, sections, sectionQuestions, questions]
  );

  useEffect(() => {
    if (submitted) return;
    const activeDeadline = sections.length > 0 ? sectionDeadline : deadline;
    if (activeDeadline === null) return;
    if (activeDeadline <= Date.now()) { submit(true); return; }
    const t = setTimeout(() => {
      setSecondsLeft(Math.max(0, (activeDeadline - Date.now()) / 1000));
    }, 1000);
    return () => clearTimeout(t);
  }, [submitted, sectionDeadline, deadline, submit]);

  if (submitted) {
    return (
      <main className="min-h-screen bg-rfcm-cream flex items-center justify-center p-4 text-center">
        <div className="bg-white/80 backdrop-blur-sm border border-rfcm-yellow-soft rounded-3xl shadow-xl p-10 max-w-sm animate-fade-in-up">
          <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl font-bold mb-3 text-rfcm-charcoal">Examination Submitted</h1>
          <p className="text-sm text-rfcm-charcoal/70 mb-6">
            Your result will be available when released by R.F.C.M. Use &quot;Check My Result&quot; from the home page later.
          </p>
          <a href="/" className="inline-block rounded-xl bg-rfcm-red text-white font-medium px-6 py-3 hover:bg-rfcm-red-dark transition-colors">
            Back to Home
          </a>
        </div>
      </main>
    );
  }

  if (submitError) {
    return (
      <main className="min-h-screen bg-rfcm-cream flex items-center justify-center p-4 text-center">
        <div className="bg-white/80 backdrop-blur-sm border border-rfcm-red rounded-3xl shadow-xl p-10 max-w-sm animate-fade-in-up">
          <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-rfcm-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl font-bold mb-3 text-rfcm-red">Submission Failed</h1>
          <p className="text-sm text-rfcm-charcoal/70 mb-6">{submitError}</p>
          <a href="/" className="inline-block rounded-xl bg-rfcm-red text-white font-medium px-6 py-3 hover:bg-rfcm-red-dark transition-colors">
            Back to Home
          </a>
        </div>
      </main>
    );
  }

  if (initializing || initError) {
    return (
      <main className="min-h-screen bg-rfcm-cream flex items-center justify-center p-4 text-center">
        {initError ? (
          <div className="bg-white/80 backdrop-blur-sm border border-rfcm-red rounded-3xl shadow-xl p-10 max-w-sm animate-fade-in-up">
            <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-rfcm-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="font-serif text-2xl font-bold mb-3 text-rfcm-red">Unable to Start Exam</h1>
            <p className="text-sm text-rfcm-charcoal/70 mb-6">{initError}</p>
            <a href="/" className="inline-block rounded-xl bg-rfcm-red text-white font-medium px-6 py-3 hover:bg-rfcm-red-dark transition-colors">
              Back to Home
            </a>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto border-4 border-rfcm-red border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-rfcm-charcoal/60">Loading examination...</p>
          </div>
        )}
      </main>
    );
  }

  const q = sectionQuestions[current] || sectionQuestions[0];
  const answeredCount = Object.keys(answers).filter((id) => answers[id]?.trim()).length;
  const totalSeconds = sectionDeadline !== null ? Math.max(0, Math.round(sectionDeadline - Date.now())) : (secondsLeft !== null ? Math.max(0, Math.round(secondsLeft)) : 0);
  const minutes = totalSeconds > 0 ? Math.floor(totalSeconds / 60) : 0;
  const seconds = totalSeconds % 60;
  const timeLow = sectionDeadline !== null ? sectionDeadline - Date.now() <= 300 : secondsLeft !== null && secondsLeft <= 300;
  const progress = sectionQuestions.length > 0 ? ((current + 1) / sectionQuestions.length) * 100 : 0;
  const sectionComplete = sectionQuestions.length > 0 && sectionAnsweredCount === sectionQuestions.length;

  return (
    <main className="min-h-screen bg-rfcm-cream">
      {!online && (
        <div className="bg-rfcm-red text-white text-sm text-center py-3 animate-slide-down">
          ⚠ Connection interrupted — your answers are saved on this device. We&apos;re trying to reconnect...
        </div>
      )}

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="mb-6 bg-white/80 backdrop-blur-sm border border-rfcm-yellow-soft rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="font-serif text-lg font-bold text-rfcm-charcoal">Examination</h1>
                <p className="text-xs text-rfcm-charcoal/60">
                  {currentSection ? `${currentSection.title} — Question ${current + 1} of ${sectionQuestions.length}` : `Question ${current + 1} of ${sectionQuestions.length}`}
                </p>
              </div>
            <div className="flex items-center gap-3">
              {savedTick && (
                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </span>
              )}
              {secondsLeft !== null && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold ${timeLow ? "bg-rfcm-red text-white animate-pulse" : "bg-rfcm-cream-dark text-rfcm-charcoal"}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {timeLow && "⚠ "}{minutes}:{String(seconds).padStart(2, "0")}
                </div>
              )}
            </div>
          </div>
          <div className="h-2 bg-rfcm-cream-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-rfcm-red transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 bg-white/80 backdrop-blur-sm border border-rfcm-yellow-soft rounded-2xl shadow-sm p-6 md:p-8">
              {q && (
                <div key={current} className="space-y-6 animate-question-in">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/50 mb-3">
                    {currentSection ? `${currentSection.title} — Question ${current + 1}` : `Question ${current + 1}`}
                  </p>
                  <p className="text-lg font-medium text-rfcm-charcoal leading-relaxed">{q.content}</p>
                </div>

                <div className="space-y-3">
                  {q.type === "mcq" && q.options?.map((opt) => (
                    <label key={opt.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${answers[q.id] === opt.id ? "border-rfcm-red bg-rfcm-red/5" : "border-rfcm-yellow-soft hover:border-rfcm-red/30 hover:bg-rfcm-cream-dark/50"}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${answers[q.id] === opt.id ? "border-rfcm-red bg-rfcm-red" : "border-rfcm-charcoal/30"}`}>
                        {answers[q.id] === opt.id && <div className="w-2 h-2 rounded-full bg-white"></div>}
                      </div>
                      <input type="radio" name={q.id} checked={answers[q.id] === opt.id}
                        onChange={() => setAnswer(q.id, opt.id)} className="hidden" />
                      <span className="text-sm text-rfcm-charcoal">{opt.text}</span>
                    </label>
                  ))}

                  {q.type === "true_false" && ["true", "false"].map((v) => (
                    <label key={v} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${answers[q.id] === v ? "border-rfcm-red bg-rfcm-red/5" : "border-rfcm-yellow-soft hover:border-rfcm-red/30 hover:bg-rfcm-cream-dark/50"}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${answers[q.id] === v ? "border-rfcm-red bg-rfcm-red" : "border-rfcm-charcoal/30"}`}>
                        {answers[q.id] === v && <div className="w-2 h-2 rounded-full bg-white"></div>}
                      </div>
                      <input type="radio" name={q.id} checked={answers[q.id] === v}
                        onChange={() => setAnswer(q.id, v)} className="hidden" />
                      <span className="text-sm text-rfcm-charcoal capitalize">{v}</span>
                    </label>
                  ))}

                  {(q.type === "fill_blank" || q.type === "essay") && (
                    <textarea
                      value={answers[q.id] ?? ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                      className="w-full rounded-xl border border-rfcm-yellow-soft px-4 py-3 outline-none focus:border-rfcm-red focus:ring-2 focus:ring-rfcm-red/20 transition-all resize-none"
                      rows={q.type === "essay" ? 8 : 3}
                      placeholder={q.type === "essay" ? "Write your answer here..." : "Type your answer..."}
                    />
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-rfcm-yellow-soft">
                  <button onClick={() => toggleMark(q.id)}
                    className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all ${marked.has(q.id) ? "bg-rfcm-yellow text-rfcm-charcoal" : "bg-rfcm-cream-dark text-rfcm-charcoal/70 hover:bg-rfcm-yellow/50"}`}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                    </svg>
                    {marked.has(q.id) ? "Marked for review" : "Mark for review"}
                  </button>
                  <div className="flex gap-2">
                    <button disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}
                      className="px-5 py-2.5 rounded-xl border border-rfcm-yellow-soft disabled:opacity-40 hover:bg-rfcm-cream-dark transition-colors font-medium text-sm">Back</button>
                    {current < sectionQuestions.length - 1 ? (
                      <button onClick={() => setCurrent((c) => c + 1)}
                        className="px-5 py-2.5 rounded-xl bg-rfcm-red text-white font-medium hover:bg-rfcm-red-dark transition-colors text-sm">Next</button>
                    ) : sectionComplete && currentSectionIndex < sections.length - 1 ? (
                      <button onClick={() => {
                        const nextSection = sections[currentSectionIndex + 1];
                        if (nextSection) {
                          const nextDeadline = Date.now() + nextSection.time_limit_minutes * 60 * 1000;
                          setSectionDeadline(nextDeadline);
                          setSecondsLeft(Math.max(0, (nextDeadline - Date.now()) / 1000));
                        }
                        setCurrentSectionIndex((s) => s + 1);
                        setCurrent(0);
                      }}
                        className="px-5 py-2.5 rounded-xl bg-rfcm-red text-white font-medium hover:bg-rfcm-red-dark transition-colors text-sm">Next Section</button>
                    ) : sectionComplete ? (
                      <button onClick={() => setShowReview(true)}
                        className="px-5 py-2.5 rounded-xl bg-rfcm-red text-white font-medium hover:bg-rfcm-red-dark transition-colors text-sm">Review &amp; Submit</button>
                    ) : (
                      <button onClick={() => setShowReview(true)}
                        className="px-5 py-2.5 rounded-xl bg-rfcm-red text-white font-medium hover:bg-rfcm-red-dark transition-colors text-sm">Review &amp; Submit</button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="w-full lg:w-72 bg-white/80 backdrop-blur-sm border border-rfcm-yellow-soft rounded-2xl shadow-sm p-5 h-fit">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60">
                {currentSection ? currentSection.title : "Questions"}
              </p>
              <span className="text-xs text-rfcm-charcoal/50">{sectionAnsweredCount}/{sectionQuestions.length}</span>
            </div>
            <div className="grid grid-cols-5 lg:grid-cols-4 gap-2 mb-4">
              {sectionQuestions.map((qq, i) => {
                const answered = !!answers[qq.id]?.trim();
                const isMarked = marked.has(qq.id);
                return (
                  <button key={qq.id} onClick={() => setCurrent(i)}
                    className={`aspect-square rounded-xl text-sm font-semibold flex items-center justify-center border-2 transition-all hover:scale-110 ${current === i ? "border-rfcm-red scale-110 shadow-lg shadow-rfcm-red/20" : "border-transparent"} ${isMarked ? "bg-rfcm-yellow text-rfcm-charcoal" : answered ? "bg-rfcm-red text-white" : "bg-rfcm-cream-dark text-rfcm-charcoal/60 hover:bg-rfcm-cream-dark/80"}`}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
            {sections.length > 0 && currentSectionIndex < sections.length - 1 && sectionComplete && (
              <button onClick={() => {
                const nextSection = sections[currentSectionIndex + 1];
                if (nextSection) {
                  const nextDeadline = Date.now() + nextSection.time_limit_minutes * 60 * 1000;
                  setSectionDeadline(nextDeadline);
                  setSecondsLeft(Math.max(0, (nextDeadline - Date.now()) / 1000));
                }
                setCurrentSectionIndex((s) => s + 1);
                setCurrent(0);
              }}
                className="w-full rounded-xl bg-rfcm-red text-white text-sm font-medium py-3 hover:bg-rfcm-red-dark transition-colors mb-2">
                Continue to next section
              </button>
            )}
            <button onClick={() => setShowReview(true)}
              className="w-full rounded-xl bg-rfcm-charcoal text-white text-sm font-medium py-3 hover:bg-rfcm-charcoal/90 transition-colors">
              Submit Exam
            </button>
          </div>
        </div>
      </div>

      {showReview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-modal-backdrop">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-modal-content">
            <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-serif text-2xl font-bold text-center mb-2 text-rfcm-charcoal">Submit Exam?</h3>
            <p className="text-sm text-rfcm-charcoal/70 text-center mb-6">
              You have answered <span className="font-bold text-rfcm-red">{sectionAnsweredCount} / {sectionQuestions.length}</span> questions.
              {sectionQuestions.length - sectionAnsweredCount > 0 && (
                <span className="block mt-1 text-amber-600">{sectionQuestions.length - sectionAnsweredCount} question(s) unanswered</span>
              )}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowReview(false)}
                className="flex-1 rounded-xl border border-rfcm-yellow-soft py-3 font-medium hover:bg-rfcm-cream-dark transition-colors">Go back</button>
              <button onClick={() => submit(false)}
                className="flex-1 rounded-xl bg-rfcm-red text-white py-3 font-medium hover:bg-rfcm-red-dark transition-colors">Submit exam</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function TakeExamPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-rfcm-cream flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto border-4 border-rfcm-red border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-rfcm-charcoal/60">Loading exam...</p>
        </div>
      </main>
    }>
      <TakeExamInner />
    </Suspense>
  );
}
