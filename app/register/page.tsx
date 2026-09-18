"use client";

import { useEffect, useState } from "react";
import StudentLayout from "@/components/StudentLayout";
import { useToast } from "@/components/ToastProvider";

type ClassOption = { id: string; name: string; class_code: string | null };

export default function RegisterPage() {
  const { showToast } = useToast();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classId, setClassId] = useState("");
  const [classCode, setClassCode] = useState("");
  const [name, setName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [password, setPassword] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.ok ? r.json() : [])
      .then(setClasses)
      .catch(() => setClasses([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("class_id", classId);
    formData.append("class_code", classCode);
    formData.append("teacher_name", teacherName);
    formData.append("password", password);
    if (photo) formData.append("photo", photo);

    const res = await fetch("/api/students/register", { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Registration failed");
      return;
    }

    setSuccess(true);
    showToast(data.updated ? "Profile updated" : "Registered successfully");
    setName("");
    setTeacherName("");
    setPhoto(null);
    setClassCode("");
    setClassId("");
  }

  return (
    <StudentLayout>
      <div className="max-w-md mx-auto bg-white rounded-2xl border border-rfcm-yellow-soft p-6 md:p-8 animate-fade-in-up">
        <h2 className="font-serif text-xl font-bold text-center mb-1">Student Registration</h2>
        <p className="text-xs text-rfcm-charcoal/60 text-center mb-6">Register once per class. Your photo is optional.</p>

        {success ? (
          <div className="text-center space-y-5 py-8">
            <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-xl text-rfcm-charcoal">Registration successful!</p>
              <p className="text-sm text-rfcm-charcoal/60 mt-1">Save your password. You can now take your examination or login to your portal.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a href="/student" className="inline-flex items-center justify-center gap-2 rounded-xl bg-rfcm-red text-white text-sm font-semibold px-5 py-3 hover:bg-rfcm-red-dark transition-colors">
                Take Exam
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <a href="/student/login" className="inline-flex items-center justify-center gap-2 rounded-xl border border-rfcm-yellow-soft text-rfcm-charcoal text-sm font-semibold px-5 py-3 hover:bg-rfcm-cream-dark transition-colors">
                Login to Portal
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">Class</label>
              <select value={classId} onChange={(e) => setClassId(e.target.value)} required
                className="w-full rounded-lg border border-rfcm-yellow-soft bg-rfcm-cream-dark px-3 py-2 outline-none focus:border-rfcm-red transition-colors">
                <option value="">Select class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">Class Code (optional)</label>
              <input value={classCode} onChange={(e) => setClassCode(e.target.value)}
                className="w-full rounded-lg border border-rfcm-yellow-soft bg-rfcm-cream-dark px-3 py-2 outline-none focus:border-rfcm-red transition-colors" />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">Full Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required
                className="w-full rounded-lg border border-rfcm-yellow-soft bg-rfcm-cream-dark px-3 py-2 outline-none focus:border-rfcm-red transition-colors" />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full rounded-lg border border-rfcm-yellow-soft bg-rfcm-cream-dark px-3 py-2 outline-none focus:border-rfcm-red transition-colors" />
              <p className="text-[10px] text-rfcm-charcoal/50 mt-1">Use this to log in later as a student.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">Teacher's Name (optional)</label>
              <input value={teacherName} onChange={(e) => setTeacherName(e.target.value)}
                className="w-full rounded-lg border border-rfcm-yellow-soft bg-rfcm-cream-dark px-3 py-2 outline-none focus:border-rfcm-red transition-colors" />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">Photo (optional)</label>
              <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                className="w-full text-sm border border-rfcm-yellow-soft rounded-lg px-3 py-2" />
            </div>

            {error && <p className="text-sm text-rfcm-red text-center">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-rfcm-red text-white font-medium py-2 disabled:opacity-50 transition-all active:scale-[0.98]">
              {loading ? "Saving..." : "Save profile"}
            </button>
          </form>
        )}
      </div>
    </StudentLayout>
  );
}
