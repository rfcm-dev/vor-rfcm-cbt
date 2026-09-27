"use client";

import { useEffect, useState } from "react";
import StudentLayout from "@/components/StudentLayout";
import ExamCard from "@/components/ExamCard";
import PrimaryButton from "@/components/PrimaryButton";
import { scoreToGrade } from "@/lib/grade";

type ExamOption = {
  id: string;
  title: string;
  exam_code: string | null;
  time_limit_minutes: number;
};

type ResultItem = {
  id: string;
  test_title: string;
  percentage: number | null;
  grade: string | null;
  status: string;
};

export default function CheckResultsPage() {
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [selectedExam, setSelectedExam] = useState<ExamOption | null>(null);
  const [className, setClassName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [studentName, setStudentName] = useState("");
  const [results, setResults] = useState<ResultItem[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [examsLoading, setExamsLoading] = useState(true);

  useEffect(() => {
    async function loadExams() {
      try {
        const res = await fetch("/api/tests?public=1");
        if (res.ok) {
          const body = await res.json();
          setExams(body.data ?? []);
        }
      } catch {
        setError("Failed to load examinations");
      } finally {
        setExamsLoading(false);
      }
    }
    loadExams();
  }, []);

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setChecked(false);

    const params = new URLSearchParams({ public: "1", class_name: className, student_name: studentName });
    if (classCode.trim()) params.set("class_code", classCode.trim());
    if (selectedExam?.id) params.set("test_id", selectedExam.id);

    try {
      const res = await fetch(`/api/results?${params}`);

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "No results found");
        setLoading(false);
        return;
      }
      const body = await res.json();
      const raw = Array.isArray(body) ? body : body.results ?? [];
      const mapped = raw.map((r: any) => ({
        id: r.id,
        test_title: r.test_title,
        percentage: r.percentage ?? 0,
        grade: r.grade ?? scoreToGrade(r.percentage ?? 0),
        status: r.status,
      }));
      setResults(mapped);
      setChecked(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResults(null);
    setChecked(false);
    setError("");
    setSelectedExam(null);
    setClassName("");
    setClassCode("");
    setStudentName("");
  }

  return (
    <StudentLayout>
      <ExamCard className="max-w-md">
        {!results ? (
          <>
            {!selectedExam ? (
              <div className="space-y-5">
                <div>
                  <h2 className="font-serif text-xl font-bold text-center mb-1">Select Examination</h2>
                  <p className="text-xs text-rfcm-charcoal/60 text-center">Choose the exam you want to check results for</p>
                </div>
                {error && (
                  <div className="bg-rfcm-red/10 border border-rfcm-red/20 rounded-xl p-3 animate-pulse">
                    <p className="text-sm text-rfcm-red text-center">{error}</p>
                  </div>
                )}
                {examsLoading ? (
                  <div className="text-center text-sm text-rfcm-charcoal/60">Loading examinations...</div>
                ) : exams.length === 0 ? (
                  <div className="bg-rfcm-cream-dark/50 rounded-2xl p-6 text-center">
                    <p className="text-sm text-rfcm-charcoal/70">No active examinations available right now.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {exams.map((exam) => (
                      <button
                        key={exam.id}
                        onClick={() => setSelectedExam(exam)}
                        className="w-full rounded-xl border border-rfcm-yellow-soft bg-white p-4 text-left hover:border-rfcm-red/40 transition-colors"
                      >
                        <p className="font-medium text-rfcm-charcoal">{exam.title}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-rfcm-charcoal/50">{exam.time_limit_minutes} minutes</p>
                          {exam.exam_code && (
                            <span className="text-[10px] font-mono bg-rfcm-cream-dark/70 text-rfcm-charcoal/70 px-2 py-0.5 rounded-md">
                              {exam.exam_code}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleCheck} className="space-y-5">
                <div>
                  <h2 className="font-serif text-xl font-bold text-center mb-1">Check Results</h2>
                  <p className="text-xs text-rfcm-charcoal/60 text-center">
                    {selectedExam.title}
                    {selectedExam.exam_code && (
                      <span className="block text-[10px] font-mono text-rfcm-charcoal/50 mt-1">Code: {selectedExam.exam_code}</span>
                    )}
                  </p>
                </div>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/70">Class Name</label>
                    <input value={className} onChange={(e) => setClassName(e.target.value)} required
                      className="w-full rounded-xl border border-rfcm-yellow-soft bg-rfcm-cream-dark/50 px-4 py-3 outline-none focus:border-rfcm-red focus:ring-2 focus:ring-rfcm-red/20 transition-all"
                      placeholder="e.g. Juniors" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/70">Class Code <span className="font-normal normal-case">(optional)</span></label>
                    <input value={classCode} onChange={(e) => setClassCode(e.target.value)}
                      className="w-full rounded-xl border border-rfcm-yellow-soft bg-rfcm-cream-dark/50 px-4 py-3 outline-none focus:border-rfcm-red focus:ring-2 focus:ring-rfcm-red/20 transition-all"
                      placeholder="Enter class code if provided" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/70">Your Name</label>
                    <input value={studentName} onChange={(e) => setStudentName(e.target.value)} required
                      className="w-full rounded-xl border border-rfcm-yellow-soft bg-rfcm-cream-dark/50 px-4 py-3 outline-none focus:border-rfcm-red focus:ring-2 focus:ring-rfcm-red/20 transition-all"
                      placeholder="e.g. John Doe" />
                  </div>
                </div>
                {error && (
                  <div className="bg-rfcm-red/10 border border-rfcm-red/20 rounded-xl p-3 animate-pulse">
                    <p className="text-sm text-rfcm-red text-center">{error}</p>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setSelectedExam(null)} className="flex-1 rounded-xl border border-rfcm-yellow-soft py-3 font-medium hover:bg-rfcm-cream-dark transition-colors">Back</button>
                  <PrimaryButton disabled={loading || !className || !studentName} type="submit" className="flex-1">
                    {loading ? "Checking..." : "Check Results"}
                  </PrimaryButton>
                </div>
              </form>
            )}
          </>
        ) : (
          <div className="text-center space-y-5">
            <div>
              <h2 className="font-serif text-xl font-bold mb-1">Your Results</h2>
              <p className="text-sm text-rfcm-charcoal/60">{studentName}</p>
              {selectedExam && (
                <p className="text-xs text-rfcm-charcoal/50 mt-1">{selectedExam.title}</p>
              )}
            </div>

            {results.length === 0 && (
              <div className="bg-rfcm-cream-dark/50 rounded-2xl p-8 text-center">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-sm text-rfcm-charcoal/70">No released results yet.</p>
                <p className="text-xs text-rfcm-charcoal/50 mt-1">Check back later or contact your teacher</p>
              </div>
            )}

            <div className="space-y-4">
              {results.map((r, idx) => (
                <div key={r.id} className={`bg-gradient-to-br from-rfcm-cream-dark/80 to-rfcm-cream-dark/30 rounded-2xl p-6 border border-rfcm-yellow-soft transition-all duration-500 ${checked ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                  style={{ transitionDelay: `${idx * 150}ms` }}>
                  <p className="text-xs uppercase tracking-wide text-rfcm-charcoal/50 mb-2">{r.test_title}</p>
                  <div className="flex items-end justify-center gap-3 mb-2">
                    <div className="text-5xl font-bold text-rfcm-red">{r.grade ?? scoreToGrade(r.percentage ?? 0)}</div>
                    <div className="text-2xl font-semibold text-rfcm-charcoal/70 mb-1">{r.percentage ?? 0}%</div>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <p className="text-xs text-rfcm-red font-medium">✓ Result Released</p>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={reset} className="text-sm text-rfcm-red font-medium hover:underline transition-colors">
              Check another result
            </button>
          </div>
        )}
      </ExamCard>
    </StudentLayout>
  );
}
