"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StudentLayout from "@/components/StudentLayout";
import ExamCard from "@/components/ExamCard";
import PrimaryButton from "@/components/PrimaryButton";

export default function StudentLandingPage() {
  const router = useRouter();
  const [className, setClassName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [studentName, setStudentName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/exam/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ class_name: className, class_code: classCode }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Something went wrong");
      return;
    }

    const body = await res.json();

    const studentRes = await fetch("/api/students/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ class_id: body.class.id, student_name: studentName }),
    });

    if (!studentRes.ok) {
      const sBody = await studentRes.json();
      setError(sBody.error ?? "Something went wrong");
      return;
    }

    const { student } = await studentRes.json();
    router.push(`/exam/instructions?test_id=${body.test.id}&student_id=${student.id}`);
  }

  return (
    <StudentLayout>
      <ExamCard>
        <form onSubmit={handleContinue} className="space-y-4">
          <h2 className="font-serif text-lg font-bold text-center mb-2">Begin Your Examination</h2>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60">Class Name</label>
            <input value={className} onChange={(e) => setClassName(e.target.value)} required
              className="w-full mt-1 rounded-lg border border-rfcm-yellow-soft bg-rfcm-cream-dark px-3 py-2 outline-none focus:border-rfcm-red" placeholder="e.g. Beginner Class" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60">Class Code (optional)</label>
            <input value={classCode} onChange={(e) => setClassCode(e.target.value)}
              className="w-full mt-1 rounded-lg border border-rfcm-yellow-soft bg-rfcm-cream-dark px-3 py-2 outline-none focus:border-rfcm-red" placeholder="If your class uses a code" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60">Full Name</label>
            <input value={studentName} onChange={(e) => setStudentName(e.target.value)} required
              className="w-full mt-1 rounded-lg border border-rfcm-yellow-soft bg-rfcm-cream-dark px-3 py-2 outline-none focus:border-rfcm-red" />
          </div>
          {error && <p className="text-sm text-rfcm-red text-center">{error}</p>}
          <PrimaryButton disabled={loading}>{loading ? "Checking..." : "Continue"}</PrimaryButton>
        </form>

        <div className="text-center mt-6">
          <a href="/check-results" className="text-sm text-rfcm-red font-medium hover:underline">
            Check My Result
          </a>
        </div>
      </ExamCard>
    </StudentLayout>
  );
}
