"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { useToast } from "@/components/ToastProvider";

type Question = { id: string; type: string; content: string; options: any; correct_answer: string | null; points: number };
type TestRow = { id: string; title: string; status: string; exam_code: string; opens_at: string | null; closes_at: string | null; time_limit_minutes: number };
type ClassRow = { id: string; name: string };

const TYPES = [
  { value: "mcq", label: "Multiple Choice" },
  { value: "true_false", label: "True / False" },
  { value: "fill_blank", label: "Fill in the Blank" },
  { value: "essay", label: "Essay" },
];

type QuestionModal = { mode: "edit" | "delete"; question: Question } | null;

export default function TestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [test, setTest] = useState<TestRow | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [publishedClasses, setPublishedClasses] = useState<ClassRow[]>([]);
  const [allClasses, setAllClasses] = useState<ClassRow[]>([]);
  const [attemptCount, setAttemptCount] = useState(0);

  const [type, setType] = useState("mcq");
  const [content, setContent] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState("");
  const [points, setPoints] = useState(1);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editTime, setEditTime] = useState(30);
  const [editOpens, setEditOpens] = useState("");
  const [editCloses, setEditCloses] = useState("");
  const [editClassIds, setEditClassIds] = useState<string[]>([]);

  const [qModal, setQModal] = useState<QuestionModal>(null);
  const [qEditContent, setQEditContent] = useState("");
  const [qEditPoints, setQEditPoints] = useState(1);
  const [qEditCorrect, setQEditCorrect] = useState("");

  const [uploadError, setUploadError] = useState("");
  const [uploadDetails, setUploadDetails] = useState<string[]>([]);
  const [uploadSuccess, setUploadSuccess] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadPublishedClasses() {
    const res = await fetch(`/api/tests/${id}/classes`);
    if (res.ok) {
      const data = await res.json();
      setPublishedClasses(data);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploadDetails([]);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append("test_id", id);
    formData.append("file", file);

    const res = await fetch("/api/questions/upload", { method: "POST", body: formData });
    const body = await res.json();

    if (!res.ok) {
      setUploadError(body.error ?? "Upload failed");
      setUploadDetails(body.details ?? []);
      return;
    }

    showToast(`Added ${body.inserted} question(s)`);
    setUploadSuccess(body.inserted);
    loadQuestions();
    e.target.value = "";
  }

  function loadQuestions() {
    fetch(`/api/questions?test_id=${id}`)
      .then((r) => r.ok ? r.json() : [])
      .then(setQuestions)
      .catch(() => setQuestions([]));
  }

  function loadAllClasses() {
    fetch("/api/classes")
      .then((r) => r.ok ? r.json() : [])
      .then(setAllClasses)
      .catch(() => setAllClasses([]));
  }

  useEffect(() => {
    Promise.all([
      fetch(`/api/tests?class_id=`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/tests/${id}/classes`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/tests/${id}/attempts`).then((r) => r.ok ? r.json() : { count: 0 }),
    ]).then(([all, classesData, attemptsData]) => {
      const t = all.find((t: TestRow) => t.id === id) ?? null;
      setTest(t);
      if (t) {
        setEditTitle(t.title);
        setEditTime(t.time_limit_minutes);
        setEditOpens(t.opens_at ? t.opens_at.slice(0, 16) : "");
        setEditCloses(t.closes_at ? t.closes_at.slice(0, 16) : "");
      }
      setPublishedClasses(classesData);
      setAttemptCount(attemptsData.count ?? 0);
    }).catch(() => {});
    loadQuestions();
    loadAllClasses();
  }, [id]);

  async function addQuestion(e: React.FormEvent) {
    e.preventDefault();
    const body: any = { test_id: id, type, content, points };
    if (type === "mcq") {
      body.options = options.filter((o) => o.trim()).map((text, i) => ({ id: String.fromCharCode(65 + i), text }));
      body.correct_answer = correct;
    } else if (type === "true_false") {
      body.correct_answer = correct;
    } else if (type === "fill_blank") {
      body.correct_answer = correct;
    }

    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      showToast("Failed to add question", "error");
      return;
    }
    showToast("Question added");
    setContent("");
    setOptions(["", "", "", ""]);
    setCorrect("");
    loadQuestions();
  }

  async function toggleActive() {
    if (!test) return;
    const res = await fetch(`/api/tests/${test.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: test.status === "active" ? "draft" : "active" }),
    });
    if (!res.ok) {
      showToast("Failed to update status", "error");
      return;
    }
    showToast(test.status === "active" ? "Exam unpublished" : "Exam published");
    setTest({ ...test, status: test.status === "active" ? "draft" : "active" });
  }

  function startEditMode() {
    if (!test) return;
    setEditTitle(test.title);
    setEditTime(test.time_limit_minutes);
    setEditOpens(test.opens_at ? test.opens_at.slice(0, 16) : "");
    setEditCloses(test.closes_at ? test.closes_at.slice(0, 16) : "");
    setEditClassIds(publishedClasses.map((c) => c.id));
    setEditing(true);
    loadAllClasses();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!test) return;
    setBusy(true);
    const res = await fetch(`/api/tests/${test.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle,
        time_limit_minutes: editTime,
        opens_at: editOpens || null,
        closes_at: editCloses || null,
        class_ids: editClassIds,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json();
      setDeleteError(body.error ?? "Failed to update exam");
      return;
    }
    const data = await res.json();
    setTest({ ...data, exam_code: test.exam_code });
    setEditing(false);
    setDeleteError("");
    showToast("Examination updated");
    loadPublishedClasses();
  }

  async function confirmDeleteTest() {
    if (!test) return;
    setBusy(true);
    const res = await fetch(`/api/tests/${test.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json();
      setDeleteError(body.error ?? "Failed to delete exam");
      return;
    }
    showToast("Examination deleted");
    router.push("/dashboard/tests");
  }

  function startQEdit(q: Question) {
    setQModal({ mode: "edit", question: q });
    setQEditContent(q.content);
    setQEditPoints(q.points);
    setQEditCorrect(q.correct_answer || "");
  }

  async function saveQEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!qModal?.question) return;
    const res = await fetch(`/api/questions/${qModal.question.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: qEditContent, points: qEditPoints, correct_answer: qEditCorrect || null }),
    });
    if (!res.ok) {
      showToast("Failed to update question", "error");
      return;
    }
    showToast("Question updated");
    setQModal(null);
    loadQuestions();
  }

  async function confirmDeleteQ() {
    if (!qModal?.question) return;
    const res = await fetch(`/api/questions/${qModal.question.id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast("Failed to delete question", "error");
      return;
    }
    showToast("Question deleted");
    setQModal(null);
    loadQuestions();
  }

  const dateStr = (iso: string | null) => iso ? new Date(iso).toLocaleString() : "—";

  return (
    <DashboardShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-rfcm-charcoal">{test?.title}</h1>
          {test && <p className="text-sm text-rfcm-charcoal/60">Exam code: <span className="font-semibold text-rfcm-red">{test.exam_code}</span></p>}
          {test && (
            <p className="text-xs text-rfcm-charcoal/50 mt-1">
              Opens: {dateStr(test.opens_at)} · Closes: {dateStr(test.closes_at)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {test && !editing && (
            <>
              <button onClick={startEditMode} className="rounded-lg border border-rfcm-yellow-soft px-4 py-2 font-medium text-sm hover:border-rfcm-red">Edit</button>
              <button onClick={() => setDeleteError("")} className="rounded-lg bg-rfcm-charcoal text-white px-4 py-2 font-medium text-sm">Delete exam</button>
            </>
          )}
          {test && editing && (
            <button onClick={toggleActive}
              className={`rounded-lg px-4 py-2 font-medium text-sm ${test.status === "active" ? "bg-rfcm-charcoal text-white" : "bg-rfcm-red text-white"}`}>
              {test.status === "active" ? "Unpublish exam" : "Publish exam"}
            </button>
          )}
        </div>
      </div>

      {deleteError && <p className="text-sm text-rfcm-red mb-4">{deleteError}</p>}

      {editing && test && (
        <form onSubmit={saveEdit} className="bg-white rounded-xl border border-rfcm-yellow-soft p-5 mb-6 max-w-2xl space-y-3">
          <p className="font-semibold text-sm">Edit examination</p>
          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required
            className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red" />
          <div className="grid grid-cols-2 gap-3">
            <input type="datetime-local" value={editOpens} onChange={(e) => setEditOpens(e.target.value)}
              className="rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red" />
            <input type="datetime-local" value={editCloses} onChange={(e) => setEditCloses(e.target.value)}
              className="rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red" />
          </div>
          <input type="number" value={editTime} onChange={(e) => setEditTime(Number(e.target.value))} min="1"
            className="w-32 rounded-lg border border-rfcm-yellow-soft px-3 py-2 outline-none focus:border-rfcm-red" />
          <div>
            <p className="text-xs text-rfcm-charcoal/60 mb-1">Published to classes</p>
            <div className="max-h-32 overflow-y-auto border border-rfcm-yellow-soft rounded-lg p-2 space-y-1">
              {allClasses.map((c) => (
                <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editClassIds.includes(c.id)} onChange={() => setEditClassIds((prev) => prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id])} className="accent-rfcm-red" />
                  <span className="text-sm text-rfcm-charcoal">{c.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="rounded-lg bg-rfcm-red text-white font-medium px-4 py-2 disabled:opacity-50">{busy ? "Saving..." : "Save changes"}</button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-rfcm-yellow-soft px-4 py-2 font-medium text-sm">Cancel</button>
          </div>
        </form>
      )}

      {test && !editing && (
        <div className="bg-white rounded-xl border border-rfcm-yellow-soft p-4 mb-6">
          <p className="text-xs text-rfcm-charcoal/60">
            Once published and within its scheduled window, students in <span className="font-semibold text-rfcm-charcoal">{publishedClasses.map((c) => c.name).join(", ") || "no classes"}</span> can access this exam by entering their class name and code on the exam page.
          </p>
        </div>
      )}

      {editing && test && (
        <div className="bg-red-50 border border-rfcm-red/20 rounded-xl p-4 mb-6">
          <p className="text-sm text-rfcm-red font-medium">Delete exam</p>
          <p className="text-xs text-rfcm-charcoal/70 mb-2">{attemptCount === 0 ? "This exam has no student attempts and can be deleted." : `This exam has ${attemptCount} student attempt(s) and cannot be deleted — unpublish it instead.`}</p>
          {attemptCount === 0 && (
            <button onClick={confirmDeleteTest} disabled={busy} className="rounded-lg bg-rfcm-red text-white text-sm font-medium px-4 py-2 disabled:opacity-50">{busy ? "Deleting..." : "Delete this exam permanently"}</button>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="space-y-6">
          <form onSubmit={addQuestion} className="bg-white rounded-xl border border-rfcm-yellow-soft p-5 space-y-3">
            <p className="font-semibold text-sm mb-1">Add a question</p>
          <select value={type} onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2">
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Question text" required
            className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2" rows={2} />

          {type === "mcq" && (
            <div className="space-y-2">
              {options.map((opt, i) => (
                <input key={i} value={opt} placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  onChange={(e) => setOptions((o) => o.map((v, idx) => (idx === i ? e.target.value : v)))}
                  className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2" />
              ))}
              <select value={correct} onChange={(e) => setCorrect(e.target.value)} required
                className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2">
                <option value="">Correct option</option>
                {options.map((_, i) => <option key={i} value={String.fromCharCode(65 + i)}>{String.fromCharCode(65 + i)}</option>)}
              </select>
            </div>
          )}

          {type === "true_false" && (
            <select value={correct} onChange={(e) => setCorrect(e.target.value)} required
              className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2">
              <option value="">Correct answer</option>
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          )}

          {type === "fill_blank" && (
            <input value={correct} onChange={(e) => setCorrect(e.target.value)} placeholder="Correct answer" required
              className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2" />
          )}

          <div className="flex items-center gap-2">
            <label className="text-xs text-rfcm-charcoal/60">Points</label>
            <input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))}
              className="w-20 rounded-lg border border-rfcm-yellow-soft px-2 py-1" />
          </div>

            <button className="rounded-lg bg-rfcm-red text-white font-medium px-4 py-2">Add question</button>
          </form>

          <div className="bg-white rounded-xl border border-rfcm-yellow-soft p-5 space-y-3">
            <p className="font-semibold text-sm">Or upload questions from Excel</p>
            <a href="/api/questions/template" className="text-xs text-rfcm-red font-medium hover:underline block">
              Download the template
            </a>
            <input type="file" accept=".xlsx" onChange={handleUpload}
              className="w-full text-sm border border-rfcm-yellow-soft rounded-lg px-3 py-2" />
            {uploadError && (
              <div className="text-xs text-rfcm-red space-y-1">
                <p>{uploadError}</p>
                {uploadDetails.map((d, i) => <p key={i}>• {d}</p>)}
              </div>
            )}
            {uploadSuccess !== null && (
              <p className="text-xs text-green-700">✓ Added {uploadSuccess} question(s) from the file</p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-semibold text-sm text-rfcm-charcoal/70">{questions.length} question(s) added</p>
          {questions.map((q, i) => (
            <div key={q.id} className="bg-white rounded-lg border border-rfcm-yellow-soft p-3 text-sm">
              <div className="flex justify-between items-start">
                <p className="font-medium flex-1">{i + 1}. {q.content}</p>
                <div className="flex gap-2 ml-2">
                  <button onClick={() => startQEdit(q)} className="text-xs text-rfcm-red font-medium hover:underline">Edit</button>
                  <button onClick={() => setQModal({ mode: "delete", question: q })} className="text-xs text-rfcm-charcoal/60 hover:text-rfcm-red font-medium">Delete</button>
                </div>
              </div>
              <p className="text-xs text-rfcm-charcoal/50 mt-1">{q.type} · {q.points} pt(s)</p>
            </div>
          ))}
        </div>
      </div>

      {qModal?.mode === "edit" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-10">
          <form onSubmit={saveQEdit} className="bg-white rounded-2xl p-6 max-w-md w-full space-y-3">
            <h3 className="font-serif text-lg font-bold">Edit question</h3>
            <textarea value={qEditContent} onChange={(e) => setQEditContent(e.target.value)} required
              className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2" rows={3} />
            <div className="flex items-center gap-2">
              <label className="text-xs text-rfcm-charcoal/60">Points</label>
              <input type="number" value={qEditPoints} onChange={(e) => setQEditPoints(Number(e.target.value))}
                className="w-20 rounded-lg border border-rfcm-yellow-soft px-2 py-1" />
            </div>
            {qModal.question.type !== "essay" && (
              <input value={qEditCorrect} onChange={(e) => setQEditCorrect(e.target.value)} placeholder="Correct answer"
                className="w-full rounded-lg border border-rfcm-yellow-soft px-3 py-2" />
            )}
            <div className="flex gap-2">
              <button type="submit" className="flex-1 rounded-md bg-rfcm-red text-white py-2 font-medium">Save</button>
              <button type="button" onClick={() => setQModal(null)} className="flex-1 rounded-md border border-rfcm-yellow-soft py-2 font-medium">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {qModal?.mode === "delete" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-10">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
            <h3 className="font-serif text-lg font-bold mb-2">Delete question?</h3>
            <p className="text-sm text-rfcm-charcoal/70 mb-4">This cannot be undone. Student answers to this question will remain in the record.</p>
            <div className="flex gap-3">
              <button onClick={() => setQModal(null)} className="flex-1 rounded-md border border-rfcm-yellow-soft py-2 font-medium">Cancel</button>
              <button onClick={confirmDeleteQ} className="flex-1 rounded-md bg-rfcm-red text-white py-2 font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
