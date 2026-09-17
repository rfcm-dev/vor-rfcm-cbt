"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useToast } from "@/components/ToastProvider";
import SkeletonCard from "@/components/SkeletonCard";

type ClassRow = { id: string; name: string; class_code: string | null };

export default function ClassesPage() {
  const { showToast } = useToast();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");

  const [uploadError, setUploadError] = useState("");
  const [uploadDetails, setUploadDetails] = useState<string[]>([]);
  const [uploadSuccess, setUploadSuccess] = useState<number | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  const [selected, setSelected] = useState<string[]>([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/classes")
      .then((r) => r.ok ? r.json() : [])
      .then(setClasses)
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, class_code: code }),
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Failed to add class");
      return;
    }
    showToast("Class added successfully");
    setName("");
    setCode("");
    setError("");
    load();
  }

  function startEdit(c: ClassRow) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditCode(c.class_code || "");
    setError("");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSavingId(editingId);
    const res = await fetch(`/api/classes/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, class_code: editCode }),
    });
    setSavingId(null);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Failed to update class");
      return;
    }
    showToast("Class updated");
    setEditingId(null);
    setError("");
    load();
  }

  async function handleDelete(id: string) {
    setSavingId(id);
    const res = await fetch(`/api/classes/${id}`, { method: "DELETE" });
    setSavingId(null);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Failed to delete class");
      return;
    }
    showToast("Class deleted");
    setError("");
    setSelected((s) => s.filter((x) => x !== id));
    load();
  }

  async function bulkDelete() {
    if (selected.length === 0) return;
    setBulkDeleteLoading(true);
    const res = await fetch("/api/bulk/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "classes", ids: selected }),
    });
    setBulkDeleteLoading(false);
    if (!res.ok) {
      const body = await res.json();
      showToast(body.error ?? "Bulk delete failed", "error");
      return;
    }
    showToast(`Deleted ${selected.length} class(es)`);
    setSelected([]);
    load();
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    setUploadError("");
    setUploadDetails([]);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/classes/upload", { method: "POST", body: formData });
    const body = await res.json();

    setUploadLoading(false);
    if (!res.ok) {
      setUploadError(body.error ?? "Upload failed");
      setUploadDetails(body.details ?? []);
      return;
    }

    showToast(`Added ${body.inserted} class(es)`);
    setUploadSuccess(body.inserted);
    load();
    e.target.value = "";
  }

  async function handleStudentUpload(classId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    setUploadError("");
    setUploadDetails([]);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append("class_id", classId);
    formData.append("file", file);

    const res = await fetch("/api/students/upload", { method: "POST", body: formData });
    const body = await res.json();

    setUploadLoading(false);
    if (!res.ok) {
      setUploadError(body.error ?? "Upload failed");
      setUploadDetails(body.details ?? []);
      return;
    }

    showToast(`Added ${body.inserted} student(s)`);
    setUploadSuccess(body.inserted);
    e.target.value = "";
  }

  function toggleSelect(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function toggleSelectAll() {
    if (selected.length === classes.length) setSelected([]);
    else setSelected(classes.map((c) => c.id));
  }

  return (
    <DashboardShell>
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold text-rfcm-charcoal">Classes</h1>
        <p className="text-sm text-rfcm-charcoal/60 mt-1">Organize students into classes for examinations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <form onSubmit={handleAdd} className="lg:col-span-1 bg-white rounded-2xl border border-rfcm-yellow-soft p-6 space-y-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60">Add new class</p>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Class name (e.g. Juniors)" required
            className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red transition-colors" />
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Class code (optional)"
            className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red transition-colors" />
          {error && <p className="text-sm text-rfcm-red">{error}</p>}
          <button type="submit" className="w-full rounded-lg bg-rfcm-red text-white font-medium py-2.5 hover:bg-rfcm-red-dark transition-colors">Add class</button>
        </form>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-rfcm-yellow-soft p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60">Bulk upload classes</p>
            <a href="/api/classes/template" className="text-xs text-rfcm-red font-medium hover:underline">Download template</a>
          </div>
          <input type="file" accept=".xlsx" onChange={handleUpload} disabled={uploadLoading}
            className="w-full text-sm border border-rfcm-yellow-soft rounded-lg px-3 py-2 disabled:opacity-50" />
          {uploadLoading && <p className="text-xs text-rfcm-charcoal/60 mt-2">Uploading...</p>}
          {uploadError && (
            <div className="text-xs text-rfcm-red space-y-1 mt-2">
              <p>{uploadError}</p>
              {uploadDetails.map((d, i) => <p key={i}>• {d}</p>)}
            </div>
          )}
          {uploadSuccess !== null && (
            <p className="text-xs text-green-700 mt-2">✓ Added {uploadSuccess} class(es) from the file</p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <>
          {classes.length > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={selected.length === classes.length} onChange={toggleSelectAll}
                  className="rounded border-rfcm-yellow-soft" />
                <span className="text-xs text-rfcm-charcoal/60">Select all</span>
              </label>
              {selected.length > 0 && (
                <button onClick={bulkDelete} disabled={bulkDeleteLoading} className="text-xs text-rfcm-red font-medium hover:underline px-3 py-1.5 rounded-md hover:bg-rfcm-red/5 transition-colors">
                  {bulkDeleteLoading ? "Deleting..." : `Delete selected (${selected.length})`}
                </button>
              )}
            </div>
          )}

          <div className="grid gap-3">
            {classes.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border border-rfcm-yellow-soft p-5 shadow-sm hover:shadow-md hover:border-rfcm-red/30 transition-all">
                {editingId === c.id ? (
                  <form onSubmit={saveEdit} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} required
                        className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red transition-colors" />
                      <input value={editCode} onChange={(e) => setEditCode(e.target.value)}
                        className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red transition-colors" />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={savingId === editingId} className="rounded-lg bg-rfcm-red text-white text-sm font-medium px-4 py-2 disabled:opacity-50 hover:bg-rfcm-red-dark transition-colors">
                        {savingId === editingId ? "Saving..." : "Save"}
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-rfcm-yellow-soft text-sm font-medium px-4 py-2 hover:bg-rfcm-cream-dark transition-colors">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)}
                        className="rounded border-rfcm-yellow-soft" />
                      <div>
                        <p className="font-medium text-rfcm-charcoal">{c.name}</p>
                        {c.class_code && <p className="text-xs text-rfcm-charcoal/50">Code: {c.class_code}</p>}
                      </div>
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(c)} className="text-xs text-rfcm-red font-medium hover:underline px-3 py-1.5 rounded-md hover:bg-rfcm-red/5 transition-colors">Edit</button>
                        <button onClick={() => handleDelete(c.id)} disabled={savingId === c.id} className="text-xs text-rfcm-charcoal/60 hover:text-rfcm-red font-medium disabled:opacity-50 px-3 py-1.5 rounded-md hover:bg-rfcm-red/5 transition-colors">
                          {savingId === c.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                      <div className="bg-rfcm-cream-dark rounded-xl p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-2">Upload students</p>
                        <input type="file" accept=".xlsx" onChange={(e) => handleStudentUpload(c.id, e)} disabled={uploadLoading}
                          className="w-full text-xs border border-rfcm-yellow-soft rounded-lg px-2 py-1 disabled:opacity-50" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {classes.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-rfcm-yellow-soft">
                <p className="text-rfcm-charcoal/50">No classes yet — add your first one above.</p>
              </div>
            )}
          </div>
        </>
      )}
    </DashboardShell>
  );
}
