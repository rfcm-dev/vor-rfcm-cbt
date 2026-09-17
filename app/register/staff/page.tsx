"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useToast } from "@/components/ToastProvider";

export default function StaffRegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("teacher");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.role) router.push("/dashboard");
      })
      .catch(() => {});
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password, role }),
    });

    setLoading(false);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Registration failed");
      return;
    }

    showToast("Account created. You can now sign in.");
    router.push("/login");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-rfcm-charcoal px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-2xl p-8 space-y-5 shadow-xl">
        <div className="flex flex-col items-center mb-2">
          <div className="w-14 h-14 relative mb-2">
            <Image src="/logo.jpg" alt="RFCM logo" fill sizes="56px" className="object-contain rounded-full" />
          </div>
          <h1 className="font-serif text-lg font-bold text-rfcm-charcoal">RFCM CBT — Create account</h1>
          <p className="text-xs text-rfcm-charcoal/50">Staff self-registration</p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red" />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
            className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red" />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red">
            <option value="teacher">Teacher</option>
            <option value="executive">Executive</option>
          </select>
        </div>

        {error && <p className="text-sm text-rfcm-red">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full rounded-lg bg-rfcm-red hover:bg-rfcm-red-dark text-white font-semibold py-2.5 disabled:opacity-60">
          {loading ? "Creating account..." : "Create account"}
        </button>

        <p className="text-xs text-rfcm-charcoal/50 text-center">
          Already have an account? <a href="/login" className="text-rfcm-red font-medium hover:underline">Sign in</a>
        </p>
      </form>
    </main>
  );
}
