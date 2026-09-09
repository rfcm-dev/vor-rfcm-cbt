"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useToast } from "@/components/ToastProvider";

type Admin = { id: string; name: string; role: string };

export default function AdminsPage() {
  const { showToast } = useToast();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  function load() {
    fetch("/api/admins")
      .then((r) => r.ok ? r.json() : [])
      .then(setAdmins)
      .catch(() => setAdmins([]));
  }
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : { role: "" })
      .then((data) => setCurrentUserRole(data.role ?? ""))
      .catch(() => setCurrentUserRole(""));
  }, []);

  useEffect(load, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password, role }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Failed to add");
      return;
    }
    showToast("Admin/teacher added");
    setName("");
    setPassword("");
    load();
  }

  return (
    <DashboardShell>
      <h1 className="font-serif text-2xl font-bold text-rfcm-charcoal mb-6">Admins &amp; teachers</h1>

      <form onSubmit={handleAdd} className="max-w-md bg-white rounded-xl border border-rfcm-yellow-soft p-5 space-y-3 mb-8">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required
          className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required
          className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2" />
        <select value={role} onChange={(e) => setRole(e.target.value)}
          className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2">
          {currentUserRole === "superadmin" && <option value="admin">Admin</option>}
          <option value="executive">Executive</option>
          <option value="teacher">Teacher</option>
        </select>
        {error && <p className="text-sm text-rfcm-red">{error}</p>}
        <button type="submit" disabled={loading} className="rounded-lg bg-rfcm-red text-white font-medium px-4 py-2 disabled:opacity-50">{loading ? "Adding..." : "Add"}</button>
      </form>

      <ul className="max-w-md space-y-2">
        {admins.map((a) => (
          <li key={a.id} className="bg-white rounded-lg border border-rfcm-yellow-soft p-3 flex justify-between">
            <span>{a.name}</span>
            <span className="text-sm text-rfcm-charcoal/60">{a.role}</span>
          </li>
        ))}
      </ul>
    </DashboardShell>
  );
}
