"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StudentLayout from "@/components/StudentLayout";
import PrimaryButton from "@/components/PrimaryButton";
import { useToast } from "@/components/ToastProvider";

type StudentProfile = {
  id: string;
  name: string;
  class_id: string;
  class_name: string;
  class_code: string | null;
  teacher_name: string | null;
  photo_url: string | null;
};

export default function StudentProfilePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mounted, setMounted] = useState(false);

  const [teacherName, setTeacherName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

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
        const studentId = meData.student.id;

        const profileRes = await fetch(`/api/students/lookup?class_id=${meData.student.id}`);
        if (profileRes.ok) {
          const students = await profileRes.json();
          const student = students.find((s: any) => s.id === studentId);
          if (student) {
            setProfile(student);
            setTeacherName(student.teacher_name || "");
          }
        }
      } catch {
        showToast("Failed to load profile", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router, showToast]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/students/lookup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: profile.id, teacher_name: teacherName }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to update profile");
        return;
      }

      setSuccess("Profile updated successfully");
      showToast("Profile updated", "success");
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/student/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: profile.id, current_password: currentPassword, new_password: newPassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to change password");
        return;
      }

      setSuccess("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      showToast("Password updated", "success");
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <StudentLayout>
        <div className="max-w-2xl mx-auto text-center py-20">
          <p className="text-sm text-rfcm-charcoal/60">Loading profile...</p>
        </div>
      </StudentLayout>
    );
  }

  if (!profile) {
    return (
      <StudentLayout>
        <div className="max-w-2xl mx-auto text-center py-20">
          <p className="text-sm text-rfcm-red">Profile not found</p>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className={`max-w-2xl mx-auto transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-2xl font-bold text-rfcm-charcoal">My Profile</h1>
          <button onClick={() => router.back()} className="text-xs text-rfcm-red font-medium hover:underline">
            Back
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-rfcm-yellow-soft p-6 md:p-8 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
            {profile.photo_url ? (
              <img src={profile.photo_url} alt={profile.name} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rfcm-red to-rfcm-red-dark flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-center sm:text-left">
              <h2 className="font-serif text-xl font-bold text-rfcm-charcoal">{profile.name}</h2>
              <p className="text-sm text-rfcm-charcoal/60">{profile.class_name}</p>
              {profile.class_code && <p className="text-xs text-rfcm-charcoal/50 mt-1">Class Code: {profile.class_code}</p>}
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">Teacher&apos;s Name</label>
              <input value={teacherName} onChange={(e) => setTeacherName(e.target.value)}
                className="w-full rounded-lg border border-rfcm-yellow-soft bg-rfcm-cream-dark px-3 py-2 outline-none focus:border-rfcm-red transition-colors" />
            </div>

            {error && <p className="text-sm text-rfcm-red">{error}</p>}
            {success && <p className="text-sm text-green-700">{success}</p>}

            <PrimaryButton disabled={saving} type="submit" className="w-full">
              {saving ? "Saving..." : "Update Profile"}
            </PrimaryButton>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-rfcm-yellow-soft p-6 md:p-8 shadow-sm">
          <h3 className="font-serif text-lg font-bold text-rfcm-charcoal mb-4">Change Password</h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required
                className="w-full rounded-lg border border-rfcm-yellow-soft bg-rfcm-cream-dark px-3 py-2 outline-none focus:border-rfcm-red transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6}
                className="w-full rounded-lg border border-rfcm-yellow-soft bg-rfcm-cream-dark px-3 py-2 outline-none focus:border-rfcm-red transition-colors" />
            </div>

            {error && <p className="text-sm text-rfcm-red">{error}</p>}
            {success && <p className="text-sm text-green-700">{success}</p>}

            <PrimaryButton disabled={saving || !currentPassword || !newPassword} type="submit" className="w-full">
              {saving ? "Updating..." : "Change Password"}
            </PrimaryButton>
          </form>
        </div>
      </div>
    </StudentLayout>
  );
}
