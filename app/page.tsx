"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StudentLayout from "@/components/StudentLayout";
import ExamCard from "@/components/ExamCard";
import PrimaryButton from "@/components/PrimaryButton";

type ClassOption = { id: string; name: string; class_code: string | null };
type StudentOption = { id: string; name: string; teacher_name: string | null; photo_url: string | null };

const STEPS = [
  { key: "class", label: "Class", description: "Select your class" },
  { key: "student", label: "Name", description: "Enter your name" },
  { key: "profile", label: "Confirm", description: "Verify your profile" },
] as const;

export default function StudentLandingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"class" | "student" | "profile">("class");
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classId, setClassId] = useState("");
  const [classCode, setClassCode] = useState("");
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentName, setStudentName] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [resolvedTestId, setResolvedTestId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [classesLoaded, setClassesLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.ok ? r.json() : [])
      .then(setClasses)
      .catch(() => setClasses([]))
      .finally(() => setClassesLoaded(true));
  }, []);

  async function resolveClass() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/exam/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ class_name: classes.find((c) => c.id === classId)?.name, class_code: classCode }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Something went wrong");
      return;
    }
    const body = await res.json();
    if (body.test?.id) setResolvedTestId(body.test.id);
    const studentRes = await fetch(`/api/students/lookup?class_id=${classId}`);
    if (studentRes.ok) {
      setStudents(await studentRes.json());
    }
    setStep("student");
  }

  async function lookupStudent() {
    if (!studentName.trim()) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/students/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ class_id: classId, student_name: studentName }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Something went wrong");
      return;
    }
    const { student } = await res.json();
    setSelectedStudent(student);
    setStep("profile");
  }

  function confirmProfile() {
    if (!selectedStudent) return;
    router.push(`/exam/instructions?test_id=${resolvedTestId}&student_id=${selectedStudent.id}`);
  }

  function startOver() {
    setSelectedStudent(null);
    setStudentName("");
    setError("");
    setStep("student");
  }

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <StudentLayout>
      <ExamCard className="max-w-md">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  i <= currentStepIndex
                    ? "bg-rfcm-red text-white shadow-lg shadow-rfcm-red/30"
                    : "bg-rfcm-cream-dark text-rfcm-charcoal/40"
                }`}>
                  {i + 1}
                </div>
                <p className={`text-[10px] mt-1 font-medium uppercase tracking-wide ${
                  i <= currentStepIndex ? "text-rfcm-red" : "text-rfcm-charcoal/40"
                }`}>{s.label}</p>
              </div>
            ))}
          </div>
          <div className="h-1 bg-rfcm-cream-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-rfcm-red transition-all duration-500 ease-out"
              style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {step === "class" && (
          <form onSubmit={(e) => { e.preventDefault(); resolveClass(); }} className="space-y-5">
            <div>
              <h2 className="font-serif text-xl font-bold text-center mb-1">Select Your Class</h2>
              <p className="text-xs text-rfcm-charcoal/60 text-center">Choose the class you belong to</p>
            </div>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/70">Class</label>
                <div className="relative">
                  <select value={classId} onChange={(e) => setClassId(e.target.value)} required
                    className="w-full rounded-xl border border-rfcm-yellow-soft bg-rfcm-cream-dark/50 px-4 py-3 outline-none focus:border-rfcm-red focus:ring-2 focus:ring-rfcm-red/20 transition-all appearance-none">
                    <option value="">Select class</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.class_code ? `(${c.class_code})` : ""}</option>)}
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-rfcm-charcoal/40 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/70">Class Code <span className="font-normal normal-case">(optional)</span></label>
                <input value={classCode} onChange={(e) => setClassCode(e.target.value)}
                  className="w-full rounded-xl border border-rfcm-yellow-soft bg-rfcm-cream-dark/50 px-4 py-3 outline-none focus:border-rfcm-red focus:ring-2 focus:ring-rfcm-red/20 transition-all"
                  placeholder="Enter class code if provided" />
              </div>
            </div>
            {error && (
              <div className="bg-rfcm-red/10 border border-rfcm-red/20 rounded-xl p-3 animate-pulse">
                <p className="text-sm text-rfcm-red text-center">{error}</p>
              </div>
            )}
            <PrimaryButton disabled={loading || !classId} type="submit">
              {loading ? "Checking..." : "Continue"}
            </PrimaryButton>
            <p className="text-xs text-rfcm-charcoal/50 text-center">
              Already checked your result? <a href="/check-results" className="text-rfcm-red font-medium hover:underline transition-colors">Check My Result</a>
            </p>
          </form>
        )}

        {step === "student" && (
          <form onSubmit={(e) => { e.preventDefault(); lookupStudent(); }} className="space-y-5">
            <div>
              <h2 className="font-serif text-xl font-bold text-center mb-1">Enter Your Name</h2>
              <p className="text-xs text-rfcm-charcoal/60 text-center">Type your full name as registered</p>
            </div>
            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/70">Full Name</label>
              <input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
                list="student-names"
                className="w-full rounded-xl border border-rfcm-yellow-soft bg-rfcm-cream-dark/50 px-4 py-3 outline-none focus:border-rfcm-red focus:ring-2 focus:ring-rfcm-red/20 transition-all"
                placeholder="e.g. John Doe"
              />
              <datalist id="student-names">
                {students.map((s) => <option key={s.id} value={s.name} />)}
              </datalist>
            </div>
            {error && (
              <div className="bg-rfcm-red/10 border border-rfcm-red/20 rounded-xl p-3 animate-pulse">
                <p className="text-sm text-rfcm-red text-center">{error}</p>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setStep("class")} className="flex-1 rounded-xl border border-rfcm-yellow-soft py-3 font-medium hover:bg-rfcm-cream-dark transition-colors">Back</button>
              <PrimaryButton disabled={loading || !studentName.trim()} type="submit" className="flex-1">
                {loading ? "Checking..." : "Continue"}
              </PrimaryButton>
            </div>
          </form>
        )}

        {step === "profile" && selectedStudent && (
          <div className="text-center space-y-5">
            <div>
              <h2 className="font-serif text-xl font-bold">Is this you?</h2>
              <p className="text-xs text-rfcm-charcoal/60 mt-1">Confirm your identity before starting</p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                {selectedStudent.photo_url ? (
                  <img src={selectedStudent.photo_url} alt={selectedStudent.name} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rfcm-red to-rfcm-red-dark flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                    {selectedStudent.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="font-semibold text-lg text-rfcm-charcoal">{selectedStudent.name}</p>
                <p className="text-sm text-rfcm-charcoal/60">{classes.find((c) => c.id === classId)?.name}</p>
                {selectedStudent.teacher_name && <p className="text-sm text-rfcm-charcoal/50">Teacher: {selectedStudent.teacher_name}</p>}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={startOver} className="flex-1 rounded-xl border border-rfcm-yellow-soft py-3 font-medium hover:bg-rfcm-cream-dark transition-colors">Not you? Start over</button>
              <PrimaryButton onClick={confirmProfile} className="flex-1">Continue</PrimaryButton>
            </div>
          </div>
        )}
      </ExamCard>
    </StudentLayout>
  );
}
