export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { autoScore } from "@/lib/scoring";

// Public route. Accepts the student's answers, auto-scores objective questions,
// and creates a pending result row. Essays wait for manual grading.
export async function POST(req: NextRequest) {
  const { attempt_id, answers, auto_submitted } = await req.json();
  if (!attempt_id || !Array.isArray(answers)) {
    return NextResponse.json({ error: "attempt_id and answers are required" }, { status: 400 });
  }

  const { data: attempt } = await db.from("attempts").select("*").eq("id", attempt_id).single();
  if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  if (attempt.status !== "in_progress") {
    return NextResponse.json({ error: "This attempt was already submitted" }, { status: 409 });
  }

  const { data: test } = await db.from("tests").select("time_limit_minutes").eq("id", attempt.test_id).single();
  const limitSeconds = (test?.time_limit_minutes ?? 0) * 60;
  const elapsedSeconds = (Date.now() - new Date(attempt.started_at).getTime()) / 1000;
  const isLate = elapsedSeconds > limitSeconds + 60;
  const finalStatus = isLate ? "auto_submitted" : (auto_submitted ? "auto_submitted" : "submitted");
  const lateSeconds = isLate ? Math.max(0, Math.round(elapsedSeconds - limitSeconds)) : 0;

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
      attempt_id,
      question_id: a.question_id,
      response: a.response,
      auto_score: score,
    };
  });

  if (rows.length === 0) {
    return NextResponse.json({ error: "No answers provided" }, { status: 400 });
  }

  const { error: answersError } = await db.from("answers").insert(rows);
  if (answersError) return NextResponse.json({ error: answersError.message }, { status: 500 });

  await db
    .from("attempts")
    .update({ status: finalStatus, submitted_at: new Date().toISOString() })
    .eq("id", attempt_id);

  try {
    await db
      .from("attempts")
      .update({ late_seconds: lateSeconds })
      .eq("id", attempt_id);
  } catch {
    // late_seconds column may not exist yet if migration has not been applied.
  }

  await db.from("results").insert({
    attempt_id,
    total_score: hasEssay ? null : objectiveTotal, // finalized once essays are graded
    status: hasEssay ? "pending_grading" : "graded",
  });

  return NextResponse.json({ ok: true });
}
