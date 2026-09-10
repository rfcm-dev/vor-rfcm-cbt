"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// Admin/teacher sign-in. Deliberately has no link from any student-facing page —
// reachable only if you know the URL, keeping the "two worlds" separation.
export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Login failed");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-rfcm-charcoal px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-2xl p-8 space-y-5 shadow-xl">
        <div className="flex flex-col items-center mb-2">
          <div className="w-14 h-14 relative mb-2">
            <Image src="/logo.jpg" alt="RFCM logo" fill sizes="56px" className="object-contain rounded-full" />
          </div>
          <h1 className="font-serif text-lg font-bold text-rfcm-charcoal">RFCM CBT — Sign in</h1>
          <p className="text-xs text-rfcm-charcoal/50">Admin &amp; Teacher access</p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red" />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red" />
        </div>

        {error && <p className="text-sm text-rfcm-red">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full rounded-lg bg-rfcm-red hover:bg-rfcm-red-dark text-white font-semibold py-2.5 disabled:opacity-60">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
