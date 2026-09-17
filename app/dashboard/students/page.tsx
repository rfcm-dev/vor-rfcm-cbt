"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useToast } from "@/components/ToastProvider";
import SkeletonCard from "@/components/SkeletonCard";

type Student = { id: string; name: string; class_id: string; class_name: string; class_code: string | null; teacher_name: string | null; photo_url: string | null };
type ClassRow = { id: string; name: string; class_code: string | null };

export default function StudentsPage() {
  const { showToast } = useToast();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTeacherName, setEditTeacherName] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [profileStudent, setProfileStudent] = useState<Student | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [uploadDetails, setUploadDetails] = useState<string[]>([]);
  const [uploadSuccess, setUploadSuccess] = useState<number | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  function loadClasses() {
    fetch("/api/classes")
      .then((r) => r.ok ? r.json() : [])
      .then(setClasses)
      .catch(() => setClasses([]));
  }

  function loadStudents() {
    if (!selectedClassId) { setStudents([]); return; }
    setLoading(true);
    const params = new URLSearchParams();
    params.set("class_id", selectedClassId);
    if (search.trim()) params.set("q", search.trim());
    fetch(`/api/students/lookup?${params}`)
      .then((r) => r.ok ? r.json() : [])
      .then(setStudents)
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }

  useEffect(loadClasses, []);
  useEffect(loadStudents, [selectedClassId, search]);

  function startEdit(s: Student) {
    setEditingId(s.id);
    setEditTeacherName(s.teacher_name || "");
    setUploadError("");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditLoading(true);
    const res = await fetch(`/api/students/lookup`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: editingId, teacher_name: editTeacherName }),
    });
    setEditLoading(false);
    if (!res.ok) {
      const body = await res.json();
      showToast(body.error ?? "Failed to update", "error");
      return;
    }
    showToast("Student updated");
    setEditingId(null);
    loadStudents();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const res = await fetch(`/api/students/lookup`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: deleteTarget }),
    });
    setDeleteLoading(false);
    if (!res.ok) {
      const body = await res.json();
      showToast(body.error ?? "Failed to delete", "error");
      return;
    }
    showToast("Student deleted");
    setDeleteTarget(null);
    setSelected((s) => s.filter((id) => id !== deleteTarget));
    loadStudents();
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedClassId) return;
    setUploadError("");
    setUploadDetails([]);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append("class_id", selectedClassId);
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
    loadStudents();
    e.target.value = "";
  }

  async function bulkDelete() {
    if (selected.length === 0) return;
    if (!confirm(`Delete ${selected.length} selected student(s)? This cannot be undone.`)) return;
    setBulkDeleteLoading(true);
    const res = await fetch("/api/students/lookup", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_ids: selected }),
    });
    setBulkDeleteLoading(false);
    if (!res.ok) {
      const body = await res.json();
      showToast(body.error ?? "Bulk delete failed", "error");
      return;
    }
    showToast(`Deleted ${selected.length} student(s)`);
    setSelected([]);
    loadStudents();
  }

  function toggleSelect(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function toggleSelectAll() {
    if (selected.length === students.length) setSelected([]);
    else setSelected(students.map((s) => s.id));
  }

  return (
    <DashboardShell>
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold text-rfcm-charcoal">Students</h1>
        <p className="text-sm text-rfcm-charcoal/60 mt-1">Manage student records per class.</p>
      </div>

      <div className="max-w-2xl space-y-4">
        <div className="bg-white rounded-2xl border border-rfcm-yellow-soft p-5 space-y-3 shadow-sm">
          <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60">Filter by class</label>
          <select value={selectedClassId} onChange={(e) => { setSelectedClassId(e.target.value); setSelected([]); }}
            className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2">
            <option value="">Select a class</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.class_code ? `(${c.class_code})` : ""}</option>)}
          </select>

          {selectedClassId && (
            <>
              <label className="block text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60 mt-3">Search students</label>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type a name..."
                className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2" />
            </>
          )}
        </div>

        {selectedClassId && (
          <div className="bg-white rounded-2xl border border-rfcm-yellow-soft p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-rfcm-charcoal/60">Bulk upload students</p>
              <a href="/api/students/template" className="text-xs text-rfcm-red font-medium hover:underline">Download template</a>
            </div>
            <input type="file" accept=".xlsx" onChange={handleUpload}
              className="w-full text-sm border border-rfcm-yellow-soft rounded-lg px-3 py-2" />
            {uploadError && (
              <div className="text-xs text-rfcm-red space-y-1">
                <p>{uploadError}</p>
                {uploadDetails.map((d, i) => <p key={i}>• {d}</p>)}
              </div>
            )}
            {uploadSuccess !== null && (
              <p className="text-xs text-green-700">✓ Added {uploadSuccess} student(s) from the file</p>
            )}
          </div>
        )}

        {selectedClassId && (
          <div className="bg-white rounded-2xl border border-rfcm-yellow-soft p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {students.length > 0 && (
                  <>
                    <input type="checkbox" checked={selected.length === students.length} onChange={toggleSelectAll}
                      className="rounded border-rfcm-yellow-soft" />
                    <span className="text-xs text-rfcm-charcoal/60">Select all</span>
                  </>
                )}
              </div>
              {selected.length > 0 && (
                <button onClick={bulkDelete} disabled={bulkDeleteLoading} className="text-xs text-rfcm-red font-medium hover:underline px-3 py-1.5 rounded-md hover:bg-rfcm-red/5 transition-colors">
                  {bulkDeleteLoading ? "Deleting..." : `Delete selected (${selected.length})`}
                </button>
              )}
            </div>

            {loading && (
              <div className="space-y-3">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            )}

            <div className="space-y-2">
              {students.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-4 border border-rfcm-yellow-soft rounded-xl hover:border-rfcm-red/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggleSelect(s.id)}
                      className="rounded border-rfcm-yellow-soft" />
                    <div>
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-rfcm-charcoal/50">{s.teacher_name || "No teacher assigned"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingId === s.id ? (
                      <form onSubmit={saveEdit} className="flex gap-2">
                        <input value={editTeacherName} onChange={(e) => setEditTeacherName(e.target.value)}
                          className="rounded-lg border border-rfcm-yellow-soft px-2 py-1 text-sm" placeholder="Teacher name" />
                        <button type="submit" disabled={editLoading} className="text-xs bg-rfcm-red text-white px-3 py-1.5 rounded disabled:opacity-50">
                          {editLoading ? "Saving..." : "Save"}
                        </button>
                        <button type="button" onClick={() => setEditingId(null)} className="text-xs border border-rfcm-yellow-soft px-3 py-1.5 rounded">Cancel</button>
                      </form>
                    ) : (
                      <>
                        <button onClick={() => setProfileStudent(s)} className="text-xs text-rfcm-charcoal/70 hover:text-rfcm-red font-medium px-2 py-1 rounded-md hover:bg-rfcm-red/5 transition-colors">View</button>
                        <button onClick={() => startEdit(s)} className="text-xs text-rfcm-red font-medium hover:underline px-2 py-1 rounded-md hover:bg-rfcm-red/5 transition-colors">Edit</button>
                        <button onClick={() => setDeleteTarget(s.id)} className="text-xs text-rfcm-charcoal/60 hover:text-rfcm-red font-medium px-2 py-1 rounded-md hover:bg-rfcm-red/5 transition-colors">Delete</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {!loading && students.length === 0 && (
                <p className="text-sm text-rfcm-charcoal/50">No students found in this class.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-10 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl text-center space-y-4">
            <h3 className="font-serif text-xl font-bold text-rfcm-charcoal">Delete student?</h3>
            <p className="text-sm text-rfcm-charcoal/70">This cannot be undone.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setDeleteTarget(null); }} className="flex-1 rounded-xl border border-rfcm-yellow-soft py-2.5 font-medium hover:bg-rfcm-cream-dark transition-colors">Cancel</button>
              <button onClick={confirmDelete} disabled={deleteLoading} className="flex-1 rounded-xl bg-rfcm-red text-white py-2.5 font-medium disabled:opacity-50 hover:bg-rfcm-red-dark transition-colors">
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {profileStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-10 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl font-bold text-rfcm-charcoal">Student Profile</h3>
              <button onClick={() => setProfileStudent(null)} className="text-rfcm-charcoal/40 hover:text-rfcm-charcoal transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col items-center gap-4">
              {profileStudent.photo_url ? (
                <img src={profileStudent.photo_url} alt={profileStudent.name} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rfcm-red to-rfcm-red-dark flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                  {profileStudent.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-center">
                <p className="font-semibold text-lg text-rfcm-charcoal">{profileStudent.name}</p>
                <p className="text-sm text-rfcm-charcoal/60">{profileStudent.class_name}</p>
                {profileStudent.class_code && <p className="text-xs text-rfcm-charcoal/50">Code: {profileStudent.class_code}</p>}
                <p className="text-sm text-rfcm-charcoal/50 mt-1">Teacher: {profileStudent.teacher_name || "Not assigned"}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
