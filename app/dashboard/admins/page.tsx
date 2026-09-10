"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useToast } from "@/components/ToastProvider";

type Admin = { id: string; name: string; role: string };

type EditState = { id: string; name: string; role: string } | null;
type DeleteState = { id: string; name: string } | null;

export default function AdminsPage() {
  const { showToast } = useToast();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [edit, setEdit] = useState<EditState>(null);
  const [editRole, setEditRole] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteState>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isSuperadmin = currentUserRole === "superadmin";

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
    showToast("User added");
    setName("");
    setPassword("");
    setRole("admin");
    load();
  }

  function startEdit(a: Admin) {
    setEdit(a);
    setEditRole(a.role);
    setEditPassword("");
    setError("");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    setEditLoading(true);
    const res = await fetch(`/api/admins/${edit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: editRole, password: editPassword || undefined }),
    });
    setEditLoading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Failed to update");
      return;
    }
    showToast("User updated");
    setEdit(null);
    setError("");
    load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const res = await fetch(`/api/admins/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteLoading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Failed to delete");
      return;
    }
    showToast("User deleted");
    setDeleteTarget(null);
    setError("");
    load();
  }

  return (
    <DashboardShell>
      <h1 className="font-serif text-2xl font-bold text-rfcm-charcoal mb-6">Users</h1>

      <form onSubmit={handleAdd} className="max-w-md bg-white rounded-xl border border-rfcm-yellow-soft p-5 space-y-3 mb-8">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required
          className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required
          className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2" />
        <select value={role} onChange={(e) => setRole(e.target.value)}
          className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2">
          {isSuperadmin && <option value="admin">Admin</option>}
          <option value="executive">Executive</option>
          <option value="teacher">Teacher</option>
        </select>
        {error && <p className="text-sm text-rfcm-red">{error}</p>}
        <button type="submit" disabled={loading} className="rounded-lg bg-rfcm-red text-white font-medium px-4 py-2 disabled:opacity-50">{loading ? "Adding..." : "Add user"}</button>
      </form>

      <ul className="max-w-md space-y-2">
        {admins.map((a) => (
          <li key={a.id} className="bg-white rounded-lg border border-rfcm-yellow-soft p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="font-medium">{a.name}</span>
              <span className="text-xs text-rfcm-charcoal/60 ml-2">{a.role}</span>
            </div>
            {isSuperadmin && (
              <div className="flex gap-2">
                <button onClick={() => startEdit(a)} className="text-xs text-rfcm-red font-medium hover:underline">Edit</button>
                <button onClick={() => setDeleteTarget({ id: a.id, name: a.name })} className="text-xs text-rfcm-charcoal/60 hover:text-rfcm-red font-medium">Delete</button>
              </div>
            )}
          </li>
        ))}
        {admins.length === 0 && <p className="text-rfcm-charcoal/50">No users yet.</p>}
      </ul>

      {edit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-10">
          <form onSubmit={saveEdit} className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-3">
            <h3 className="font-serif text-lg font-bold">Edit user</h3>
            <p className="text-sm text-rfcm-charcoal/60">{edit.name}</p>
            <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2">
              <option value="admin">Admin</option>
              <option value="executive">Executive</option>
              <option value="teacher">Teacher</option>
            </select>
            <input type="text" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="New password (leave blank to keep)"
              className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2" />
            {error && <p className="text-sm text-rfcm-red">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setEdit(null)} className="flex-1 rounded-md border border-rfcm-yellow-soft py-2 font-medium">Cancel</button>
              <button type="submit" disabled={editLoading} className="flex-1 rounded-md bg-rfcm-red text-white py-2 font-medium disabled:opacity-50">
                {editLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-10">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
            <h3 className="font-serif text-lg font-bold mb-2">Delete user?</h3>
            <p className="text-sm text-rfcm-charcoal/70 mb-4">
              Are you sure you want to delete <span className="font-semibold">{deleteTarget.name}</span>? This cannot be undone.
            </p>
            {error && <p className="text-sm text-rfcm-red text-center mb-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setDeleteTarget(null); setError(""); }} className="flex-1 rounded-md border border-rfcm-yellow-soft py-2 font-medium">Cancel</button>
              <button onClick={confirmDelete} disabled={deleteLoading} className="flex-1 rounded-md bg-rfcm-red text-white py-2 font-medium disabled:opacity-50">
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

