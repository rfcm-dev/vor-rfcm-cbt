export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { autoScore } from "@/lib/scoring";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();

  const { data: attempts, error } = await db
    .from("attempts")
    .select("id, test_id, student_id, started_at, draft_answers, status")
    .eq("status", "in_progress")
    .lt("started_at", new Date(now.getTime() - 10 * 60 * 1000).toISOString());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const testIds = Array.from(new Set((attempts ?? []).map((a: any) => a.test_id).filter(Boolean)));
  const { data: tests } = testIds.length > 0
    ? await db.from("tests").select("id, title, time_limit_minutes").in("id", testIds)
    : { data: [] as any[] };

  const studentIds = Array.from(new Set((attempts ?? []).map((a: any) => a.student_id).filter(Boolean)));
  const { data: students } = studentIds.length > 0
    ? await db.from("students").select("id, name, class_id").in("id", studentIds)
    : { data: [] as any[] };
  const classIds = Array.from(new Set((students ?? []).map((s: any) => s.class_id).filter(Boolean)));
  const { data: classes } = classIds.length > 0
    ? await db.from("classes").select("id, name").in("id", classIds)
    : { data: [] as any[] };

  const { data: questionCounts } = await db
    .from("questions")
    .select("test_id")
    .in("test_id", testIds.length ? testIds : ["00000000-0000-0000-0000-000000000000"]);

  const countsByTest = new Map<string, number>();
  for (const row of questionCounts ?? []) {
    countsByTest.set(row.test_id, (countsByTest.get(row.test_id) ?? 0) + 1);
  }

  const testMap = Object.fromEntries((tests ?? []).map((t: any) => [t.id, t]));
  const studentMap = Object.fromEntries((students ?? []).map((s: any) => [s.id, s]));
  const classMap = Object.fromEntries((classes ?? []).map((c: any) => [c.id, c]));

  const enriched = (attempts ?? []).map((a: any) => {
    const draft = (a.draft_answers ?? {}) as Record<string, string>;
    const answeredCount = Object.values(draft).filter((v) => typeof v === "string" && v.trim()).length;
    const student = studentMap[a.student_id];
    const cls = classMap[student?.class_id];
    return {
      id: a.id,
      test_id: a.test_id,
      test_title: testMap[a.test_id]?.title ?? "Unknown",
      time_limit_minutes: testMap[a.test_id]?.time_limit_minutes ?? 0,
      total_questions: countsByTest.get(a.test_id) ?? 0,
      student_id: a.student_id,
      student_name: student?.name ?? "Unknown",
      class_name: cls?.name ?? "",
      started_at: a.started_at,
      draft_answers: draft,
      answered_count: answeredCount,
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { attempt_id, action } = await req.json();
  if (!attempt_id || !action) {
    return NextResponse.json({ error: "attempt_id and action are required" }, { status: 400 });
  }

  const { data: attempt } = await db.from("attempts").select("*").eq("id", attempt_id).single();
  if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  if (attempt.status !== "in_progress") {
    return NextResponse.json({ error: "Attempt is not in progress" }, { status: 400 });
  }

  if (action === "finalize") {
    const draft = (attempt.draft_answers ?? {}) as Record<string, string>;
    const answers = Object.entries(draft)
      .filter(([, v]) => typeof v === "string" && v.trim())
      .map(([question_id, response]) => ({ question_id, response }));

    if (answers.length === 0) {
      return NextResponse.json({ error: "No saved answers to finalize" }, { status: 400 });
    }

    const { data: questions } = await db.from("questions").select("*").eq("test_id", attempt.test_id);
    const questionsById = new Map((questions ?? []).map((q) => [q.id, q]));

    let hasEssay = false;
    let objectiveTotal = 0;

    const rows = answers.map((a: { question_id: string; response: string }) => {
      const q = questionsById.get(a.question_id);
      const score = q ? autoScore(q, a.response) : null;
      if (q?.type === "essay") hasEssay = true;
      if (typeof score === "number") objectiveTotal += score;
      return {
        attempt_id: attempt.id,
        question_id: a.question_id,
        response: a.response,
        auto_score: score,
      };
    });

    await db.from("answers").insert(rows);

    const updatePayload = { status: "auto_submitted" as const, submitted_at: new Date().toISOString() };
    const { error: updateError } = await db
      .from("attempts")
      .update(updatePayload)
      .eq("id", attempt.id);

    if (updateError) {
      console.error("Failed to update attempt status", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await db.from("results").insert({
      attempt_id: attempt.id,
      total_score: hasEssay ? null : objectiveTotal,
      status: hasEssay ? "pending_grading" : "graded",
    });

    return NextResponse.json({ ok: true });
  }

  if (action === "retake") {
    const { error: retakeError } = await db.from("retake_approvals").insert({
      test_id: attempt.test_id,
      student_id: attempt.student_id,
      approved_by: user.id,
    });

    if (retakeError) return NextResponse.json({ error: retakeError.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
