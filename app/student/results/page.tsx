"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StudentLayout from "@/components/StudentLayout";
import PrimaryButton from "@/components/PrimaryButton";
import { useToast } from "@/components/ToastProvider";
import { scoreToGrade } from "@/lib/grade";

type AttemptHistory = {
  id: string;
  test_id: string;
  test_title: string;
  status: string;
  started_at: string;
  submitted_at: string | null;
  total_score: number | null;
  percentage: number | null;
  grade: string | null;
  result_status: string;
};

export default function StudentResultsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [attempts, setAttempts] = useState<AttemptHistory[]>([]);
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

        const res = await fetch("/api/student/exams/history");
        if (res.ok) {
          const data = await res.json();
          setAttempts(data.attempts ?? []);
        }
      } catch {
        showToast("Failed to load exam history", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router, showToast]);

  if (loading) {
    return (
      <StudentLayout>
        <div className="max-w-2xl mx-auto text-center py-20">
          <p className="text-sm text-rfcm-charcoal/60">Loading exam history...</p>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className={`max-w-2xl mx-auto transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-2xl font-bold text-rfcm-charcoal">Exam History</h1>
          <button onClick={() => router.push("/student/dashboard")} className="text-xs text-rfcm-red font-medium hover:underline">
            Back to Dashboard
          </button>
        </div>

        {attempts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-rfcm-yellow-soft p-8 text-center">
            <p className="text-sm text-rfcm-charcoal/50">No exam attempts yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attempts.map((attempt, idx) => (
              <div key={attempt.id} className={`bg-white rounded-2xl border border-rfcm-yellow-soft p-5 shadow-sm hover:shadow-md hover:border-rfcm-red/30 transition-all ${mounted ? "animate-fade-in-up opacity-100 translate-y-0" : "opacity-0 translate-y-4"} stagger-${(idx % 6) + 1}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-rfcm-charcoal">{attempt.test_title}</p>
                    <p className="text-xs text-rfcm-charcoal/50 mt-1">
                      Started: {new Date(attempt.started_at).toLocaleString()}
                    </p>
                    {attempt.submitted_at && (
                      <p className="text-xs text-rfcm-charcoal/50">
                        Submitted: {new Date(attempt.submitted_at).toLocaleString()}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        attempt.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                        attempt.status === "submitted" || attempt.status === "auto_submitted" ? "bg-yellow-100 text-yellow-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {attempt.status.replace(/_/g, " ")}
                      </span>
                      {attempt.result_status === "released" && attempt.total_score !== null && (
                        <span className="text-xs text-rfcm-charcoal/60">
                          {attempt.total_score}% · Grade {attempt.grade ?? "N/A"}
                        </span>
                      )}
                    </div>
                  </div>
                  {attempt.result_status === "released" && attempt.total_score !== null && (
                    <button onClick={() => router.push(`/api/export/result?attempt_id=${attempt.id}`)} className="inline-flex items-center gap-2 rounded-xl border border-rfcm-yellow-soft text-rfcm-charcoal text-sm font-medium px-4 py-2 hover:bg-rfcm-cream-dark transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Result
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
