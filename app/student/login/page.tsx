"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PrimaryButton from "@/components/PrimaryButton";
import { useToast } from "@/components/ToastProvider";

export default function StudentLoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/student-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }

    showToast("Welcome back!", "success");
    router.push("/student/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-rfcm-charcoal px-4">
      <div className={`max-w-sm w-full bg-white rounded-2xl p-6 md:p-8 shadow-xl transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <div className="text-center mb-6">
          <h2 className="font-serif text-xl font-bold text-rfcm-charcoal">Student Login</h2>
          <p className="text-xs text-rfcm-charcoal/60 mt-1">Sign in with your registered name and password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full rounded-lg border border-rfcm-yellow-soft bg-rfcm-cream-dark px-3 py-2 outline-none focus:border-rfcm-red focus:ring-2 focus:ring-rfcm-red/20 transition-all" />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full rounded-lg border border-rfcm-yellow-soft bg-rfcm-cream-dark px-3 py-2 outline-none focus:border-rfcm-red focus:ring-2 focus:ring-rfcm-red/20 transition-all" />
          </div>

          {error && (
            <div className="bg-rfcm-red/10 border border-rfcm-red/20 rounded-xl p-3">
              <p className="text-sm text-rfcm-red text-center">{error}</p>
            </div>
          )}

          <PrimaryButton disabled={loading || !name || !password} type="submit" className="w-full">
            {loading ? "Signing in..." : "Sign in"}
          </PrimaryButton>
        </form>

        <p className="text-xs text-rfcm-charcoal/50 text-center mt-4">
          Not registered yet? <a href="/register" className="text-rfcm-red font-medium hover:underline">Register here</a>
        </p>
      </div>
    </div>
  );
}
