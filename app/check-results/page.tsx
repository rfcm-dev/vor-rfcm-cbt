"use client";

import { useEffect, useState } from "react";
import StudentLayout from "@/components/StudentLayout";
import ExamCard from "@/components/ExamCard";
import PrimaryButton from "@/components/PrimaryButton";
import { scoreToGrade } from "@/lib/grade";

export default function CheckResultsPage() {
  const [className, setClassName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [studentName, setStudentName] = useState("");
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setChecked(false);

    const params = new URLSearchParams({ public: "1", class_name: className, student_name: studentName });
    if (classCode.trim()) params.set("class_code", classCode.trim());

    try {
      const res = await fetch(`/api/results?${params}`);

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "No results found");
        setLoading(false);
        return;
      }
      const body = await res.json();
      setResults(Array.isArray(body) ? body : [body]);
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
  }

  return (
    <StudentLayout>
      <ExamCard className="max-w-md">
        {!results ? (
          <form onSubmit={handleCheck} className="space-y-5">
            <div>
              <h2 className="font-serif text-xl font-bold text-center mb-1">Check Your Results</h2>
              <p className="text-xs text-rfcm-charcoal/60 text-center">Enter your details to view released results</p>
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
            <PrimaryButton disabled={loading || !className || !studentName} type="submit">
              {loading ? "Checking..." : "Check Results"}
            </PrimaryButton>
          </form>
        ) : (
          <div className="text-center space-y-5">
            <div>
              <h2 className="font-serif text-xl font-bold mb-1">Your Results</h2>
              <p className="text-sm text-rfcm-charcoal/60">{studentName}</p>
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
                    <div className="text-5xl font-bold text-rfcm-red">{r.grade ?? scoreToGrade(r.total_score)}</div>
                    <div className="text-2xl font-semibold text-rfcm-charcoal/70 mb-1">{r.total_score}%</div>
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
