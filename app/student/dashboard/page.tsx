"use client";

import { useMemo, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import StudentLayout from "@/components/StudentLayout";
import PrimaryButton from "@/components/PrimaryButton";
import { useToast } from "@/components/ToastProvider";

type ExamSummary = {
  id: string;
  test_id: string;
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
  const showToastRef = useRef(showToast);

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

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
        showToastRef.current("Failed to load dashboard", "error");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  const activeExam = useMemo(() => exams.find((e) => e.status === "in_progress"), [exams]);
  const availableExams = useMemo(() => exams.filter((e) => e.status === "not_started"), [exams]);
  const completedExams = useMemo(() => exams.filter((e) => e.status === "submitted" || e.status === "auto_submitted"), [exams]);

  async function handleLogout() {
    await fetch("/api/auth/student-logout", { method: "POST" });
    showToast("Signed out", "success");
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <StudentLayout>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-rfcm-yellow-soft p-5 animate-pulse">
                <div className="h-4 bg-rfcm-cream-dark rounded w-1/3 mb-3" />
                <div className="h-8 bg-rfcm-cream-dark rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (!student) {
    return null;
  }

  return (
    <StudentLayout>
      <div className={`max-w-6xl mx-auto transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold text-rfcm-charcoal">Student Portal</h1>
            <p className="text-sm text-rfcm-charcoal/60 mt-1">Welcome back, {student.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/student/profile")} className="inline-flex items-center gap-2 rounded-xl border border-rfcm-yellow-soft px-4 py-2 text-sm font-medium hover:bg-rfcm-cream-dark transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile
            </button>
            <button onClick={() => router.push("/student/results")} className="inline-flex items-center gap-2 rounded-xl border border-rfcm-yellow-soft px-4 py-2 text-sm font-medium hover:bg-rfcm-cream-dark transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              History
            </button>
            <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-xl border border-rfcm-red/20 text-rfcm-red px-4 py-2 text-sm font-medium hover:bg-rfcm-red/5 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-rfcm-yellow-soft p-5 shadow-sm hover:shadow-md transition-all">
            <p className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">Available Exams</p>
            <p className="text-3xl font-bold text-rfcm-charcoal">{availableExams.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-rfcm-yellow-soft p-5 shadow-sm hover:shadow-md transition-all">
            <p className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">In Progress</p>
            <p className="text-3xl font-bold text-rfcm-charcoal">{activeExam ? 1 : 0}</p>
          </div>
          <div className="bg-white rounded-2xl border border-rfcm-yellow-soft p-5 shadow-sm hover:shadow-md transition-all">
            <p className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">Released Results</p>
            <p className="text-3xl font-bold text-rfcm-charcoal">{results.length}</p>
          </div>
        </div>

        {/* Active Exam Banner */}
        {activeExam && (
          <div className="mb-8">
            <h2 className="font-serif text-lg font-bold text-rfcm-charcoal mb-3">Continue Exam</h2>
            <div className="bg-gradient-to-br from-rfcm-red/5 to-rfcm-red/10 rounded-2xl border border-rfcm-red/20 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="font-medium text-rfcm-charcoal text-lg">{activeExam.title}</p>
                  <p className="text-xs text-rfcm-charcoal/50 mt-1">You have an exam in progress</p>
                </div>
                <PrimaryButton onClick={() => router.push(`/exam/take?attempt_id=${activeExam.id}`)}>
                  Resume Exam
                </PrimaryButton>
              </div>
            </div>
          </div>
        )}

        {/* Available Examinations */}
        <div className="mb-8">
          <h2 className="font-serif text-lg font-bold text-rfcm-charcoal mb-3">Available Examinations</h2>
          {availableExams.length === 0 ? (
            <div className="bg-white rounded-2xl border border-rfcm-yellow-soft p-8 text-center">
              <p className="text-sm text-rfcm-charcoal/50">No available exams right now.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {availableExams.map((exam, idx) => (
                <div key={`${exam.test_id}-${exam.status}`} className={`bg-white rounded-2xl border border-rfcm-yellow-soft p-5 shadow-sm hover:shadow-md hover:border-rfcm-red/30 transition-all ${mounted ? "animate-fade-in-up opacity-100 translate-y-0" : "opacity-0 translate-y-4"} stagger-${idx + 1}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="font-medium text-rfcm-charcoal">{exam.title}</p>
                      <p className="text-xs text-rfcm-charcoal/50 mt-1">Status: {exam.status.replace(/_/g, " ")}</p>
                    </div>
                    {exam.status === "not_started" && (
                      <button onClick={() => router.push(`/exam/instructions?test_id=${exam.test_id}`)} className="inline-flex items-center gap-2 rounded-xl bg-rfcm-red text-white text-sm font-medium px-4 py-2 hover:bg-rfcm-red-dark transition-colors">
                        Start Exam
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Results */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-lg font-bold text-rfcm-charcoal">My Results</h2>
            {results.length > 0 && (
              <button onClick={() => router.push("/student/results")} className="text-xs text-rfcm-red font-medium hover:underline">
                View all
              </button>
            )}
          </div>
          {results.length === 0 ? (
            <div className="bg-white rounded-2xl border border-rfcm-yellow-soft p-8 text-center">
              <p className="text-sm text-rfcm-charcoal/50">No released results yet.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {results.slice(0, 5).map((r, idx) => (
                <div key={r.id} className={`bg-white rounded-2xl border border-rfcm-yellow-soft p-5 shadow-sm hover:shadow-md hover:border-rfcm-red/30 transition-all ${mounted ? "animate-fade-in-up opacity-100 translate-y-0" : "opacity-0 translate-y-4"} stagger-${(idx % 6) + 1}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="font-medium text-rfcm-charcoal">{r.test_title}</p>
                      <p className="text-xs text-rfcm-charcoal/50 mt-1">
                        {r.total_score !== null ? `${r.total_score}% · Grade ${r.grade ?? "N/A"}` : "Processing"}
                      </p>
                    </div>
                    {r.status === "released" && r.total_score !== null && (
                      <button onClick={() => router.push(`/api/export/result?attempt_id=${r.id}`)} className="inline-flex items-center gap-2 rounded-xl border border-rfcm-yellow-soft text-rfcm-charcoal text-sm font-medium px-4 py-2 hover:bg-rfcm-cream-dark transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download Result
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
