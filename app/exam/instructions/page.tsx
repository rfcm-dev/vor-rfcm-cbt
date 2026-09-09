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
  const studentId = searchParams.get("student_id") ?? "";

  const [test, setTest] = useState<{ title: string; time_limit_minutes: number } | null>(null);
  const [questionCount, setQuestionCount] = useState(0);

  useEffect(() => {
    if (!testId) return;
    fetch(`/api/tests/${testId}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((body) => {
        setTest({ title: body.title, time_limit_minutes: body.time_limit_minutes });
        setQuestionCount(body.question_count);
      })
      .catch(() => {});
  }, [testId]);

  return (
    <StudentLayout>
      <ExamCard className="max-w-md">
        <h2 className="font-serif text-xl font-bold text-center mb-4">{test?.title ?? "Examination"}</h2>

        <div className="flex justify-around text-center mb-6">
          <div>
            <div className="text-2xl font-bold text-rfcm-red">{questionCount}</div>
            <div className="text-xs text-rfcm-charcoal/60 uppercase tracking-wide">Questions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-rfcm-red">{test?.time_limit_minutes ?? "--"}</div>
            <div className="text-xs text-rfcm-charcoal/60 uppercase tracking-wide">Minutes</div>
          </div>
        </div>

        <div className="bg-rfcm-yellow-soft/40 rounded-lg p-4 mb-6 text-sm">
          <p className="font-semibold mb-2 text-rfcm-charcoal">Important</p>
          <ul className="space-y-1 text-rfcm-charcoal/80 list-disc list-inside">
            <li>Do not refresh or close this page</li>
            <li>Your answers are saved automatically as you go</li>
            <li>The examination submits automatically when time runs out</li>
          </ul>
        </div>

        <PrimaryButton onClick={() => router.push(`/exam/take?test_id=${testId}&student_id=${studentId}`)}>
          Start Exam
        </PrimaryButton>
      </ExamCard>
    </StudentLayout>
  );
}

export default function InstructionsPage() {
  return (
    <Suspense fallback={<StudentLayout><ExamCard className="max-w-md"><div className="text-rfcm-charcoal/60">Loading instructions...</div></ExamCard></StudentLayout>}>
      <InstructionsInner />
    </Suspense>
  );
}
