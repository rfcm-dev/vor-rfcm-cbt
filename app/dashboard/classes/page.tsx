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

  async function confirmDelete() {
    if (!modal) return;
    setBusyId(modal.id);
    const res = await fetch(`/api/classes/${modal.id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Failed to delete class");
      return;
    }
    showToast("Class deleted");
    setModal(null);
    setError("");
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
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{c.name}</p>
                  {c.class_code && <p className="text-xs text-rfcm-charcoal/50">Code: {c.class_code}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(c)} className="text-xs text-rfcm-red font-medium hover:underline">Edit</button>
                  <button onClick={() => setModal({ mode: "delete", id: c.id, name: c.name })}
                    className="text-xs text-rfcm-charcoal/60 hover:text-rfcm-red font-medium">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {classes.length === 0 && <p className="text-rfcm-charcoal/50">No classes yet — add your first one above.</p>}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-10">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
            <h3 className="font-serif text-lg font-bold mb-2">Delete class?</h3>
            <p className="text-sm text-rfcm-charcoal/70 mb-4">
              Are you sure you want to delete <span className="font-semibold">{modal.name}</span>? This cannot be undone.
            </p>
            {error && modal.mode === "delete" && <p className="text-sm text-rfcm-red text-center mb-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setModal(null); setError(""); }} className="flex-1 rounded-md border border-rfcm-yellow-soft py-2 font-medium">Cancel</button>
              <button onClick={confirmDelete} disabled={busyId === modal.id}
                className="flex-1 rounded-md bg-rfcm-red text-white py-2 font-medium disabled:opacity-50">
                {busyId === modal.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
