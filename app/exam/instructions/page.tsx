"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StudentLayout from "@/components/StudentLayout";
import ExamCard from "@/components/ExamCard";
import PrimaryButton from "@/components/PrimaryButton";
import { Suspense } from "react";

function InstructionsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const testId = searchParams.get("test_id") ?? "";

  const [studentId, setStudentId] = useState("");
  const [test, setTest] = useState<{ title: string; time_limit_minutes: number } | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const meRes = await fetch("/api/auth/me/student");
        if (meRes.ok) {
          const meData = await meRes.json();
          setStudentId(meData.student.id);
        }
      } catch {
        setError("Unable to get student information");
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!testId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    fetch(`/api/tests/${testId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Test not found");
        return r.json();
      })
      .then((body) => {
        setTest({ title: body.title, time_limit_minutes: body.time_limit_minutes });
        setQuestionCount(body.question_count);
      })
      .catch((e) => {
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [testId]);

  function startExam() {
    if (!studentId) {
      setError("Student information not loaded");
      return;
    }
    setStarting(true);
    router.push(`/exam/take?test_id=${testId}&student_id=${studentId}`);
  }

  if (loading) {
    return (
      <StudentLayout>
        <ExamCard className="max-w-md">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto border-4 border-rfcm-red border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-rfcm-charcoal/60">Loading examination details...</p>
          </div>
        </ExamCard>
      </StudentLayout>
    );
  }

  if (error) {
    return (
      <StudentLayout>
        <ExamCard className="max-w-md">
          <div className="text-center space-y-4">
            <p className="text-sm text-rfcm-red">Failed to load examination: {error}</p>
            <button onClick={() => router.back()} className="text-sm text-rfcm-red hover:underline">
              Go back
            </button>
          </div>
        </ExamCard>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <ExamCard className="max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto bg-rfcm-red/10 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-rfcm-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="font-serif text-2xl font-bold text-rfcm-charcoal mb-2">{test?.title ?? "Examination"}</h2>
          <p className="text-sm text-rfcm-charcoal/60">Read the instructions carefully before starting</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-rfcm-cream-dark/50 rounded-2xl p-4 text-center border border-rfcm-yellow-soft">
            <div className="text-3xl font-bold text-rfcm-red mb-1">{questionCount}</div>
            <div className="text-xs text-rfcm-charcoal/60 uppercase tracking-wide">Questions</div>
          </div>
          <div className="bg-rfcm-cream-dark/50 rounded-2xl p-4 text-center border border-rfcm-yellow-soft">
            <div className="text-3xl font-bold text-rfcm-red mb-1">{test?.time_limit_minutes ?? "--"}</div>
            <div className="text-xs text-rfcm-charcoal/60 uppercase tracking-wide">Minutes</div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-amber-900 mb-2">Important Guidelines</p>
              <ul className="space-y-1.5 text-sm text-amber-800">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">•</span>
                  <span>Do not refresh or close this page during the examination</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">•</span>
                  <span>Your answers are saved automatically as you progress</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">•</span>
                  <span>The examination will submit automatically when time runs out</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <PrimaryButton onClick={startExam} disabled={starting}>
          {starting ? "Starting..." : "Start Examination"}
        </PrimaryButton>
      </ExamCard>
    </StudentLayout>
  );
}

export default function InstructionsPage() {
  return (
    <Suspense fallback={
      <StudentLayout>
        <ExamCard className="max-w-md">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto border-4 border-rfcm-red border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-rfcm-charcoal/60">Loading instructions...</p>
          </div>
        </ExamCard>
      </StudentLayout>
    }>
      <InstructionsInner />
    </Suspense>
  );
}
