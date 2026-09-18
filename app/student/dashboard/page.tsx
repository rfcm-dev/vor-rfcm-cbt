"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StudentLayout from "@/components/StudentLayout";
import PrimaryButton from "@/components/PrimaryButton";
import { useToast } from "@/components/ToastProvider";

type ExamSummary = {
  id: string;
  title: string;
  status: string;
  started_at: string | null;
  submitted_at: string | null;
  result: { total_score: number | null; status: string } | null;
};

type ResultSummary = {
  id: string;
  test_id: string;
  test_title: string;
  total_score: number | null;
  percentage: number | null;
  grade: string | null;
  status: string;
  submitted_at: string | null;
};

export default function StudentDashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [student, setStudent] = useState<{ id: string; name: string } | null>(null);
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [results, setResults] = useState<ResultSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch("/api/auth/me/student");
        if (!meRes.ok) {
          router.push("/student/login");
          return;
        }
        const meData = await meRes.json();
        setStudent({ id: meData.student.id, name: meData.student.name });

        const [examsRes, resultsRes] = await Promise.all([
          fetch("/api/student/exams"),
          fetch("/api/student/results"),
        ]);

        if (examsRes.ok) {
          const data = await examsRes.json();
          setExams(data.exams ?? []);
        }
        if (resultsRes.ok) {
          const data = await resultsRes.json();
          setResults(data.results ?? []);
        }
      } catch {
        showToast("Failed to load dashboard", "error");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router, showToast]);

  async function handleLogout() {
    await fetch("/api/auth/student-logout", { method: "POST" });
    showToast("Signed out", "success");
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <StudentLayout>
        <div className="max-w-2xl mx-auto text-center py-20">
          <p className="text-sm text-rfcm-charcoal/60">Loading your portal...</p>
        </div>
      </StudentLayout>
    );
  }

  if (!student) {
    return null;
  }

  const activeExam = exams.find((e) => e.status === "in_progress");
  const completedExams = exams.filter((e) => e.status === "submitted" || e.status === "auto_submitted");

  return (
    <StudentLayout>
      <div className={`max-w-2xl mx-auto transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-2xl font-bold text-rfcm-charcoal">Student Portal</h1>
            <p className="text-sm text-rfcm-charcoal/60 mt-1">Welcome, {student.name}</p>
          </div>
          <button onClick={handleLogout} className="text-xs text-rfcm-red font-medium hover:underline">
            Sign out
          </button>
        </div>

        {activeExam && (
          <div className="mb-8 animate-fade-in-up">
            <h2 className="font-serif text-lg font-bold text-rfcm-charcoal mb-3">Continue Exam</h2>
            <div className="bg-white rounded-2xl border border-rfcm-yellow-soft p-5 shadow-sm hover:shadow-md transition-all">
              <p className="font-medium text-rfcm-charcoal">{activeExam.title}</p>
              <p className="text-xs text-rfcm-charcoal/50 mt-1">You have an exam in progress</p>
              <PrimaryButton onClick={() => router.push(`/exam/take?attempt_id=${activeExam.id}`)} className="mt-4">
                Resume Exam
              </PrimaryButton>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="font-serif text-lg font-bold text-rfcm-charcoal mb-3">Available Examinations</h2>
          {exams.filter((e) => e.status === "in_progress").length === 0 ? (
            <p className="text-sm text-rfcm-charcoal/50">No active exams right now.</p>
          ) : (
            <div className="space-y-3">
              {exams.map((exam, idx) => (
                <div key={exam.id} className={`bg-white rounded-2xl border border-rfcm-yellow-soft p-5 shadow-sm hover:shadow-md hover:border-rfcm-red/30 transition-all ${mounted ? "animate-fade-in-up opacity-100 translate-y-0" : "opacity-0 translate-y-4"} stagger-${idx + 1}`}>
                  <p className="font-medium text-rfcm-charcoal">{exam.title}</p>
                  <p className="text-xs text-rfcm-charcoal/50 mt-1">Status: {exam.status}</p>
                  {exam.status === "not_started" && (
                    <button onClick={() => router.push(`/exam/instructions?test_id=${exam.id}`)} className="mt-3 text-xs text-rfcm-red font-medium hover:underline">
                      Start Exam
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="font-serif text-lg font-bold text-rfcm-charcoal mb-3">My Results</h2>
          {results.length === 0 ? (
            <p className="text-sm text-rfcm-charcoal/50">No released results yet.</p>
          ) : (
            <div className="space-y-3">
              {results.map((r, idx) => (
                <div key={r.id} className={`bg-white rounded-2xl border border-rfcm-yellow-soft p-5 shadow-sm hover:shadow-md hover:border-rfcm-red/30 transition-all ${mounted ? "animate-fade-in-up opacity-100 translate-y-0" : "opacity-0 translate-y-4"} stagger-${(idx % 6) + 1}`}>
                  <p className="font-medium text-rfcm-charcoal">{r.test_title}</p>
                  <p className="text-xs text-rfcm-charcoal/50 mt-1">
                    {r.total_score !== null ? `${r.total_score}% · Grade ${r.grade ?? "N/A"}` : "Processing"}
                  </p>
                  {r.status === "released" && r.total_score !== null && (
                    <button onClick={() => router.push(`/api/export/result?attempt_id=${r.id}`)} className="mt-2 text-xs text-rfcm-red font-medium hover:underline">
                      Download Result
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
