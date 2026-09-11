"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useToast } from "@/components/ToastProvider";

type ClassRow = { id: string; name: string; class_code: string | null };

type ModalState = { mode: "delete"; id: string; name: string } | null;

export default function ClassesPage() {
  const { showToast } = useToast();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [uploadError, setUploadError] = useState("");
  const [uploadDetails, setUploadDetails] = useState<string[]>([]);
  const [uploadSuccess, setUploadSuccess] = useState<number | null>(null);

  const [selected, setSelected] = useState<string[]>([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  function toggleSelect(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function load() {
    fetch("/api/classes")
      .then((r) => r.ok ? r.json() : [])
      .then(setClasses)
      .catch(() => setClasses([]));
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
    showToast("Class added");
    setName("");
    setCode("");
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
    const res = await fetch(`/api/classes/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, class_code: editCode }),
    });
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
    setBusyId(id);
    const res = await fetch(`/api/classes/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Failed to delete class");
      return;
    }
    showToast("Class deleted. This cannot be undone.");
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
    showToast(`Deleted ${selected.length} class(es). This cannot be undone.`);
    setSelected([]);
    load();
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploadDetails([]);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/classes/upload", { method: "POST", body: formData });
    const body = await res.json();

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
    setUploadError("");
    setUploadDetails([]);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append("class_id", classId);
    formData.append("file", file);

    const res = await fetch("/api/students/upload", { method: "POST", body: formData });
    const body = await res.json();

    if (!res.ok) {
      setUploadError(body.error ?? "Upload failed");
      setUploadDetails(body.details ?? []);
      return;
    }

    showToast(`Added ${body.inserted} student(s)`);
    setUploadSuccess(body.inserted);
    e.target.value = "";
  }

  return (
    <DashboardShell>
      <h1 className="font-serif text-2xl font-bold text-rfcm-charcoal mb-6">Classes</h1>

      <form onSubmit={handleAdd} className="max-w-md bg-white rounded-xl border border-rfcm-yellow-soft p-5 space-y-3 mb-8">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Class name (e.g. Juniors)" required
          className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red" />
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Class code (optional)"
          className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red" />
        {error && <p className="text-sm text-rfcm-red">{error}</p>}
        <button type="submit" className="rounded-lg bg-rfcm-red text-white font-medium px-4 py-2">Add class</button>
      </form>

      <div className="bg-white rounded-xl border border-rfcm-yellow-soft p-5 space-y-3 mb-8">
        <p className="font-semibold text-sm">Or upload classes from Excel</p>
        <a href="/api/classes/template" className="text-xs text-rfcm-red font-medium hover:underline block">Download the template</a>
        <input type="file" accept=".xlsx" onChange={handleUpload}
          className="w-full text-sm border border-rfcm-yellow-soft rounded-lg px-3 py-2" />
        {uploadError && (
          <div className="text-xs text-rfcm-red space-y-1">
            <p>{uploadError}</p>
            {uploadDetails.map((d, i) => <p key={i}>• {d}</p>)}
          </div>
        )}
        {uploadSuccess !== null && (
          <p className="text-xs text-green-700">✓ Added {uploadSuccess} class(es) from the file</p>
        )}
      </div>

      <div className="max-w-md space-y-2">
        {classes.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <input type="checkbox" checked={selected.length === classes.length} onChange={() => {
              if (selected.length === classes.length) setSelected([]);
              else setSelected(classes.map((c) => c.id));
            }} className="rounded border-rfcm-yellow-soft" />
            <span className="text-xs text-rfcm-charcoal/60">Select all</span>
            {selected.length > 0 && (
              <button onClick={bulkDelete} disabled={bulkDeleteLoading} className="text-xs text-rfcm-red font-medium hover:underline ml-auto">
                {bulkDeleteLoading ? "Deleting..." : `Delete selected (${selected.length})`}
              </button>
            )}
          </div>
        )}
        {classes.map((c) => (
          <div key={c.id} className="bg-white rounded-lg border border-rfcm-yellow-soft p-4">
            {editingId === c.id ? (
              <form onSubmit={saveEdit} className="space-y-2">
                <input value={editName} onChange={(e) => setEditName(e.target.value)} required
                  className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red" />
                <input value={editCode} onChange={(e) => setEditCode(e.target.value)}
                  className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red" />
                <div className="flex gap-2">
                  <button type="submit" className="rounded-lg bg-rfcm-red text-white text-sm font-medium px-3 py-1.5">Save</button>
                  <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-rfcm-yellow-soft text-sm font-medium px-3 py-1.5">Cancel</button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)}
                    className="rounded border-rfcm-yellow-soft" />
                  <div>
                    <p className="font-medium">{c.name}</p>
                    {c.class_code && <p className="text-xs text-rfcm-charcoal/50">Code: {c.class_code}</p>}
                  </div>
                </label>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(c)} className="text-xs text-rfcm-red font-medium hover:underline">Edit</button>
                    <button onClick={() => handleDelete(c.id)} disabled={busyId === c.id} className="text-xs text-rfcm-charcoal/60 hover:text-rfcm-red font-medium disabled:opacity-50">
                      {busyId === c.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                  <div className="bg-white rounded-lg border border-rfcm-yellow-soft p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mb-2">Upload students</p>
                    <input type="file" accept=".xlsx" onChange={(e) => handleStudentUpload(c.id, e)}
                      className="w-full text-xs border border-rfcm-yellow-soft rounded-lg px-2 py-1" />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {classes.length === 0 && <p className="text-rfcm-charcoal/50">No classes yet — add your first one above.</p>}
      </div>
    </DashboardShell>
  );
}
