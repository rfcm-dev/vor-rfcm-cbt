"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import { useToast } from "@/components/ToastProvider";

type Test = { id: string; title: string; status: string; time_limit_minutes: number; exam_code: string; opens_at: string | null; closes_at: string | null; class_count: number };
type ClassRow = { id: string; name: string };

export default function TestsPage() {
  const { showToast } = useToast();
  const [tests, setTests] = useState<Test[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  function load() {
    Promise.all([
      fetch("/api/tests").then((r) => r.ok ? r.json() : []),
      fetch("/api/classes").then((r) => r.ok ? r.json() : []),
    ]).then(([testsData, classesData]) => {
      setTests(testsData);
      setClasses(classesData);
    }).catch(() => { setTests([]); setClasses([]); });
  }
  useEffect(load, []);

  const classMap = Object.fromEntries(classes.map((c) => [c.id, c.name]));

  function toggleSelect(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function toggleSelectAll() {
    if (selected.length === tests.length) {
      setSelected([]);
    } else {
      setSelected(tests.map((t) => t.id));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const res = await fetch(`/api/tests/${deleteTarget}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json();
      setDeleteError(body.error ?? "Failed to delete exam");
      return;
    }
    showToast("Examination deleted");
    setDeleteTarget(null);
    setDeleteError("");
    setSelected((s) => s.filter((id) => id !== deleteTarget));
    load();
  }

  async function bulkDelete() {
    if (selected.length === 0) return;
    if (!confirm(`Delete ${selected.length} selected examination(s)? This cannot be undone.`)) return;
    setBulkDeleteLoading(true);
    const res = await fetch("/api/bulk/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "tests", ids: selected }),
    });
    setBulkDeleteLoading(false);
    if (!res.ok) {
      const body = await res.json();
      showToast(body.error ?? "Bulk delete failed", "error");
      return;
    }
    showToast(`Deleted ${selected.length} examination(s)`);
    setSelected([]);
    load();
  }

  const formatDate = (iso: string | null) => iso ? new Date(iso).toLocaleString() : "—";

  return (
    <DashboardShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold text-rfcm-charcoal">Examinations</h1>
        <div className="flex gap-2">
          {selected.length > 0 && (
            <button onClick={bulkDelete} disabled={bulkDeleteLoading} className="rounded-lg bg-rfcm-red text-white px-4 py-2 font-medium disabled:opacity-50">
              {bulkDeleteLoading ? "Deleting..." : `Delete selected (${selected.length})`}
            </button>
          )}
          <Link href="/dashboard/tests/new" className="rounded-lg bg-rfcm-red text-white px-4 py-2 font-medium">
            + New examination
          </Link>
        </div>
      </div>
      <div className="space-y-3 max-w-2xl">
        {tests.length > 0 && (
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={selected.length === tests.length} onChange={toggleSelectAll}
              className="rounded border-rfcm-yellow-soft" />
            <span className="text-xs text-rfcm-charcoal/60">Select all</span>
          </div>
        )}
        {tests.map((t) => (
          <div key={t.id} className="bg-white rounded-xl border border-rfcm-yellow-soft p-4 flex justify-between items-center hover:border-rfcm-red transition-colors">
            <label className="flex items-center gap-3 flex-1 cursor-pointer">
              <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggleSelect(t.id)}
                className="rounded border-rfcm-yellow-soft" />
              <div>
                <p className="font-medium">{t.title}</p>
                <p className="text-xs text-rfcm-charcoal/50 mt-0.5">Code: <span className="font-semibold text-rfcm-red">{t.exam_code}</span></p>
                <p className="text-xs text-rfcm-charcoal/50">Opens: {formatDate(t.opens_at)} · Published to {t.class_count} class(es)</p>
              </div>
            </label>
            <div className="flex items-center gap-3 ml-4">
              <span className="text-sm text-rfcm-charcoal/60">{t.status} · {t.time_limit_minutes}m</span>
              <button onClick={() => setDeleteTarget(t.id)} className="text-xs text-rfcm-charcoal/60 hover:text-rfcm-red font-medium">Delete</button>
            </div>
          </div>
        ))}
        {tests.length === 0 && <p className="text-rfcm-charcoal/50">No examinations yet — create your first one.</p>}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-10">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
            <h3 className="font-serif text-lg font-bold mb-2">Delete examination?</h3>
            <p className="text-sm text-rfcm-charcoal/70 mb-4">
              Are you sure you want to delete <span className="font-semibold">{tests.find((t) => t.id === deleteTarget)?.title}</span>? This cannot be undone.
            </p>
            {deleteError && <p className="text-sm text-rfcm-red text-center mb-3">{deleteError}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setDeleteTarget(null); setDeleteError(""); }} className="flex-1 rounded-md border border-rfcm-yellow-soft py-2 font-medium">Cancel</button>
              <button onClick={confirmDelete} disabled={busy}
                className="flex-1 rounded-md bg-rfcm-red text-white py-2 font-medium disabled:opacity-50">
                {busy ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
