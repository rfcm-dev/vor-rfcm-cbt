"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useToast } from "@/components/ToastProvider";

type Admin = { id: string; name: string; role: string; created_at: string; permissions: Record<string, boolean> };

type EditState = { id: string; name: string; role: string; created_at: string; permissions: Record<string, boolean> } | null;
type ResetState = { id: string; name: string } | null;
type DeleteState = { id: string; name: string } | null;

const ALL_PERMISSIONS = [
  { key: "manage_classes", label: "Manage Classes", description: "Create, edit, delete classes" },
  { key: "manage_students", label: "Manage Students", description: "Upload, edit, delete students" },
  { key: "manage_tests", label: "Manage Examinations", description: "Create, edit, delete exams" },
  { key: "grade_essays", label: "Grade Essays", description: "Score essay answers" },
  { key: "release_results", label: "Release Results", description: "Publish results to students" },
  { key: "view_submissions", label: "View Submissions", description: "See all attempts and submissions" },
  { key: "view_reports", label: "View Reports", description: "Access analytics and exports" },
  { key: "manage_users", label: "Manage Users", description: "Create, edit, delete accounts" },
] as const;

const ROLE_TEMPLATES: Record<string, Record<string, boolean>> = {
  superadmin: {
    manage_classes: true,
    manage_students: true,
    manage_tests: true,
    grade_essays: true,
    release_results: true,
    view_submissions: true,
    view_reports: true,
    manage_users: true,
  },
  admin: {
    manage_classes: true,
    manage_students: true,
    manage_tests: true,
    grade_essays: true,
    release_results: true,
    view_submissions: true,
    view_reports: true,
    manage_users: true,
  },
  executive: {
    manage_classes: false,
    manage_students: false,
    manage_tests: false,
    grade_essays: false,
    release_results: true,
    view_submissions: true,
    view_reports: true,
    manage_users: false,
  },
  teacher: {
    manage_classes: false,
    manage_students: false,
    manage_tests: true,
    grade_essays: true,
    release_results: false,
    view_submissions: true,
    view_reports: false,
    manage_users: false,
  },
};

const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  admin: ROLE_TEMPLATES.admin,
  executive: ROLE_TEMPLATES.executive,
  teacher: ROLE_TEMPLATES.teacher,
};

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    superadmin: "bg-purple-100 text-purple-700 border-purple-200",
    admin: "bg-blue-100 text-blue-700 border-blue-200",
    executive: "bg-amber-100 text-amber-700 border-amber-200",
    teacher: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[role] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
      {role}
    </span>
  );
}

function PermissionToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between p-3 rounded-xl border border-rfcm-yellow-soft hover:border-rfcm-red/30 transition-colors cursor-pointer group">
      <div>
        <p className="text-sm font-medium text-rfcm-charcoal group-hover:text-rfcm-red transition-colors">{label}</p>
        <p className="text-xs text-rfcm-charcoal/50">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-rfcm-red/50 focus:ring-offset-2 ${checked ? "bg-rfcm-red" : "bg-rfcm-charcoal/20"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </label>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-rfcm-yellow-soft p-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-rfcm-cream-dark rounded w-1/3" />
              <div className="h-3 bg-rfcm-cream-dark rounded w-1/4" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 bg-rfcm-cream-dark rounded w-16" />
              <div className="h-8 bg-rfcm-cream-dark rounded w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminsPage() {
  const { showToast } = useToast();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [edit, setEdit] = useState<EditState>(null);
  const [editPassword, setEditPassword] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [resetTarget, setResetTarget] = useState<ResetState>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteState>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);

  const isSuperadmin = currentUserRole === "superadmin";

  function load() {
    setPageLoading(true);
    fetch("/api/admins")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        setAdmins(data.map((u: any) => ({
          ...u,
          permissions: u.permissions ?? DEFAULT_PERMISSIONS[u.role] ?? {},
        })));
      })
      .catch(() => setAdmins([]))
      .finally(() => setPageLoading(false));
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
    const permissions = DEFAULT_PERMISSIONS[role] ?? {};
    const res = await fetch("/api/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password, role, permissions }),
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
    setEdit({
      id: a.id,
      name: a.name,
      role: a.role,
      created_at: a.created_at,
      permissions: { ...(a.permissions ?? DEFAULT_PERMISSIONS[a.role] ?? {}) },
    });
    setError("");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    setEditLoading(true);
    const res = await fetch(`/api/admins/${edit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: edit.name, role: edit.role, permissions: edit.permissions }),
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

  function applyRoleTemplate(roleKey: string) {
    if (!edit) return;
    setEdit({
      ...edit,
      role: roleKey,
      permissions: { ...(ROLE_TEMPLATES[roleKey] ?? {}) },
    });
  }

  function togglePermission(key: string, checked: boolean) {
    if (!edit) return;
    setEdit({
      ...edit,
      permissions: { ...edit.permissions, [key]: checked },
    });
  }

  function startReset(a: Admin) {
    setResetTarget(a);
    setNewPassword("");
    setError("");
  }

  async function confirmReset() {
    if (!resetTarget || !newPassword) return;
    setResetLoading(true);
    const res = await fetch(`/api/admins/${resetTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    setResetLoading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Failed to reset password");
      return;
    }
    showToast(`Password reset for ${resetTarget.name}`);
    setResetTarget(null);
    setNewPassword("");
    setError("");
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold text-rfcm-charcoal">Users</h1>
        {isSuperadmin && (
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-purple-100 text-purple-700 border border-purple-200">Superadmin</span>
        )}
      </div>

      <form onSubmit={handleAdd} className="max-w-md bg-white rounded-2xl border border-rfcm-yellow-soft p-6 space-y-4 mb-8 shadow-sm">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required
            className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters" required minLength={6}
            className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red transition-colors">
            {isSuperadmin && <option value="admin">Admin</option>}
            <option value="executive">Executive</option>
            <option value="teacher">Teacher</option>
          </select>
        </div>
        {error && <p className="text-sm text-rfcm-red">{error}</p>}
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-rfcm-red text-white font-medium py-2.5 disabled:opacity-50 hover:bg-rfcm-red-dark transition-colors">
          {loading ? "Adding..." : "Add user"}
        </button>
      </form>

      {pageLoading ? (
        <LoadingSkeleton />
      ) : (
        <div className="grid gap-4">
          {admins.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl border border-rfcm-yellow-soft p-5 shadow-sm hover:shadow-md transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rfcm-cream-dark flex items-center justify-center text-sm font-bold text-rfcm-charcoal">
                    {a.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-rfcm-charcoal">{a.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <RoleBadge role={a.role} />
                      <span className="text-xs text-rfcm-charcoal/40">{new Date(a.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                {isSuperadmin && a.role !== "superadmin" && (
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(a)} className="text-xs text-rfcm-red font-medium hover:underline px-3 py-1.5 rounded-md hover:bg-rfcm-red/5 transition-colors">Edit</button>
                    <button onClick={() => startReset(a)} className="text-xs text-rfcm-charcoal/60 hover:text-rfcm-red font-medium px-3 py-1.5 rounded-md hover:bg-rfcm-red/5 transition-colors">Reset password</button>
                    <button onClick={() => setDeleteTarget({ id: a.id, name: a.name })} className="text-xs text-rfcm-charcoal/60 hover:text-rfcm-red font-medium px-3 py-1.5 rounded-md hover:bg-rfcm-red/5 transition-colors">Delete</button>
                  </div>
                )}
                {isSuperadmin && a.role === "superadmin" && (
                  <span className="text-xs text-rfcm-charcoal/40 italic">You</span>
                )}
              </div>
            </div>
          ))}
          {admins.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-rfcm-yellow-soft">
              <p className="text-rfcm-charcoal/50">No users yet. Add your first user above.</p>
            </div>
          )}
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-10 backdrop-blur-sm">
          <form onSubmit={saveEdit} className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl font-bold text-rfcm-charcoal">Edit user</h3>
                <p className="text-sm text-rfcm-charcoal/60 mt-1">Update details, role, and permissions</p>
              </div>
              <button type="button" onClick={() => setEdit(null)} className="text-rfcm-charcoal/40 hover:text-rfcm-charcoal transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">Name</label>
                <input type="text" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Full name" required
                  className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">Role</label>
                <select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })} className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red transition-colors">
                  <option value="admin">Admin</option>
                  <option value="executive">Executive</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-2">Quick templates</label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(ROLE_TEMPLATES).map((roleKey) => (
                  <button key={roleKey} type="button" onClick={() => applyRoleTemplate(roleKey)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${edit.role === roleKey ? "bg-rfcm-red text-white border-rfcm-red" : "bg-white text-rfcm-charcoal border-rfcm-yellow-soft hover:border-rfcm-red"}`}>
                    {roleKey}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-2">Permissions</label>
              <div className="grid grid-cols-1 gap-2">
                {ALL_PERMISSIONS.map((perm) => (
                  <PermissionToggle
                    key={perm.key}
                    label={perm.label}
                    description={perm.description}
                    checked={!!edit.permissions[perm.key]}
                    onChange={(checked) => togglePermission(perm.key, checked)}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-1">New password (optional)</label>
              <input type="text" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Leave blank to keep current"
                className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red transition-colors" />
            </div>

            {error && <p className="text-sm text-rfcm-red">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEdit(null)} className="flex-1 rounded-xl border border-rfcm-yellow-soft py-2.5 font-medium hover:bg-rfcm-cream-dark transition-colors">Cancel</button>
              <button type="submit" disabled={editLoading} className="flex-1 rounded-xl bg-rfcm-red text-white py-2.5 font-medium disabled:opacity-50 hover:bg-rfcm-red-dark transition-colors">
                {editLoading ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {resetTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-10 backdrop-blur-sm">
          <form onSubmit={(e) => { e.preventDefault(); confirmReset(); }} className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="font-serif text-xl font-bold text-rfcm-charcoal">Reset password</h3>
            <p className="text-sm text-rfcm-charcoal/70">Resetting password for <span className="font-semibold text-rfcm-charcoal">{resetTarget.name}</span></p>
            <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New temporary password" required minLength={6}
              className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red transition-colors" />
            {error && <p className="text-sm text-rfcm-red">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setResetTarget(null); setError(""); }} className="flex-1 rounded-xl border border-rfcm-yellow-soft py-2.5 font-medium hover:bg-rfcm-cream-dark transition-colors">Cancel</button>
              <button type="submit" disabled={resetLoading} className="flex-1 rounded-xl bg-rfcm-red text-white py-2.5 font-medium disabled:opacity-50 hover:bg-rfcm-red-dark transition-colors">
                {resetLoading ? "Resetting..." : "Reset"}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-10 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl text-center space-y-4">
            <h3 className="font-serif text-xl font-bold text-rfcm-charcoal">Delete user?</h3>
            <p className="text-sm text-rfcm-charcoal/70">
              Are you sure you want to delete <span className="font-semibold text-rfcm-charcoal">{deleteTarget.name}</span>? This cannot be undone.
            </p>
            {error && <p className="text-sm text-rfcm-red text-center">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setDeleteTarget(null); setError(""); }} className="flex-1 rounded-xl border border-rfcm-yellow-soft py-2.5 font-medium hover:bg-rfcm-cream-dark transition-colors">Cancel</button>
              <button onClick={confirmDelete} disabled={deleteLoading} className="flex-1 rounded-xl bg-rfcm-red text-white py-2.5 font-medium disabled:opacity-50 hover:bg-rfcm-red-dark transition-colors">
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
