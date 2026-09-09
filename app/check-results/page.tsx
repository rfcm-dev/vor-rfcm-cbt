"use client";

import { useState } from "react";
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

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResults(null);

    const params = new URLSearchParams({ public: "1", class_name: className, student_name: studentName });
    if (classCode.trim()) params.set("class_code", classCode.trim());

    const res = await fetch(`/api/results?${params}`);

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "No results found");
      return;
    }
    const body = await res.json();
    setResults(Array.isArray(body) ? body : [body]);
  }

  return (
    <StudentLayout>
      <ExamCard>
        {!results ? (
          <form onSubmit={handleCheck} className="space-y-4">
            <h2 className="font-serif text-lg font-bold text-center mb-2">Check Your Results</h2>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60">Class Name</label>
              <input value={className} onChange={(e) => setClassName(e.target.value)} required
                className="w-full mt-1 rounded-lg border border-rfcm-yellow-soft bg-rfcm-cream-dark px-3 py-2 outline-none focus:border-rfcm-red" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60">Class Code (optional)</label>
              <input value={classCode} onChange={(e) => setClassCode(e.target.value)}
                className="w-full mt-1 rounded-lg border border-rfcm-yellow-soft bg-rfcm-cream-dark px-3 py-2 outline-none focus:border-rfcm-red" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60">Your Name</label>
              <input value={studentName} onChange={(e) => setStudentName(e.target.value)} required
                className="w-full mt-1 rounded-lg border border-rfcm-yellow-soft bg-rfcm-cream-dark px-3 py-2 outline-none focus:border-rfcm-red" />
            </div>
            {error && <p className="text-sm text-rfcm-red text-center">{error}</p>}
            <PrimaryButton>Check Results</PrimaryButton>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <p className="font-serif font-bold text-lg">{studentName}</p>
            {results.length === 0 && <p className="text-sm text-rfcm-charcoal/70">No released results yet.</p>}
            {results.map((r) => (
              <div key={r.id} className="bg-rfcm-cream-dark rounded-xl p-4">
                <p className="text-xs uppercase tracking-wide text-rfcm-charcoal/50 mb-1">{r.test_title}</p>
                <div className="text-5xl font-bold text-rfcm-red mb-1">{r.grade ?? scoreToGrade(r.total_score)}</div>
                <p className="text-2xl font-semibold">{r.total_score}%</p>
                <p className="text-xs text-rfcm-red font-medium mt-2">✓ Result Released</p>
              </div>
            ))}
          </div>
        )}
      </ExamCard>
    </StudentLayout>
  );
}
