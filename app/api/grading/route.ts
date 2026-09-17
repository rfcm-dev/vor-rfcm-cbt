export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

// GET: list ungraded essay answers (the grading queue), optionally filtered by test_id.
// POST: submit a manual score for one essay answer.
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  const testId = req.nextUrl.searchParams.get("test_id");
  const includeGraded = req.nextUrl.searchParams.get("all") === "1" && ["superadmin", "admin"].includes(user?.role ?? "");

  let essayQuestionsQuery = db.from("questions").select("id, test_id, type, content, points").eq("type", "essay");
  if (testId) essayQuestionsQuery = essayQuestionsQuery.eq("test_id", testId);
  const { data: essayQuestions } = await essayQuestionsQuery;
  const essayQuestionIds = Array.from(new Set((essayQuestions ?? []).map((q: any) => q.id).filter(Boolean)));

  let answersQuery = db.from("answers").select("*");
  if (!includeGraded) answersQuery = answersQuery.is("manual_score", null);
  const { data: answers, error } = essayQuestionIds.length > 0
    ? await answersQuery.in("question_id", essayQuestionIds)
    : { data: [] as any[], error: null as any };
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const attemptIds = Array.from(new Set((answers ?? []).map((a: any) => a.attempt_id).filter(Boolean)));
  const { data: overviewRows } = attemptIds.length > 0
    ? await db.from("attempt_overview").select("*").in("attempt_id", attemptIds)
    : { data: [] as any[] };

  const overviewMap = new Map((overviewRows ?? []).map((r: any) => [r.attempt_id, r]));

  const enriched = (answers ?? []).map((a: any) => {
    const overview = overviewMap.get(a.attempt_id);
    const question = essayQuestions?.find((q: any) => q.id === a.question_id);
    return {
      ...a,
      questions: question
        ? {
            ...question,
            tests: overview
              ? {
                  title: overview.test_title,
                }
              : null,
          }
        : null,
      attempts: overview
        ? {
            students: {
              name: overview.student_name,
            },
          }
        : null,
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { answer_id, manual_score } = await req.json();
  if (!answer_id || typeof manual_score !== "number") {
    return NextResponse.json({ error: "answer_id and manual_score are required" }, { status: 400 });
  }

  const { error } = await db
    .from("answers")
    .update({ manual_score, graded_by: user.id, graded_at: new Date().toISOString() })
    .eq("id", answer_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Recompute the attempt's result once all its essay answers are graded.
  const { data: answer } = await db.from("answers").select("attempt_id").eq("id", answer_id).single();
  if (!answer) return NextResponse.json({ ok: true, message: "Score saved, but could not locate attempt" });

  const { data: allAnswers } = await db.from("answers").select("id, question_id, manual_score, auto_score").eq("attempt_id", answer.attempt_id);
  const questionIds = Array.from(new Set((allAnswers ?? []).map((a: any) => a.question_id).filter(Boolean)));
  const { data: questions } = questionIds.length > 0
    ? await db.from("questions").select("id, type").in("id", questionIds)
    : { data: [] as any[] };
  const questionMap = Object.fromEntries((questions ?? []).map((q: any) => [q.id, q]));

  const answersWithScores = (allAnswers ?? []).map((a: any) =>
    a.id === answer_id ? { ...a, manual_score } : a
  );
  const stillPending = answersWithScores.some((a: any) => questionMap[a.question_id]?.type === "essay" && a.manual_score === null);

  let updated = false;
  let totalScore: number | null = null;
  if (!stillPending) {
    totalScore = answersWithScores.reduce(
      (sum: number, a: any) => sum + (a.manual_score ?? a.auto_score ?? 0),
      0
    );
    const { error: updateError } = await db
      .from("results")
      .update({ total_score: totalScore, status: "graded" })
      .eq("attempt_id", answer.attempt_id);

    if (!updateError) {
      updated = true;
    } else {
      console.error("Failed to update result status after grading", updateError);
    }
  }

  return NextResponse.json({
    ok: true,
    stillPending,
    updated,
    total_score: totalScore,
    attempt_id: answer.attempt_id,
  });
}
