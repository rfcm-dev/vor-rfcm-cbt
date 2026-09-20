export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { getAttemptOverview } from "@/lib/attempt-overview";
import { deriveAttemptView } from "@/lib/attempt-status";

export async function GET(req: NextRequest) {
  try {
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
    const overviewRows = await getAttemptOverview({
      stuckOnly: false,
      includeInProgress: true,
    });
    const overviewMap = new Map((overviewRows ?? []).map((r: any) => [r.attempt_id, r]));

    const enriched = (answers ?? []).map((a: any) => {
      const overview = overviewMap.get(a.attempt_id);
      const question = essayQuestions?.find((q: any) => q.id === a.question_id);
      const view = overview ? deriveAttemptView({
        attempt_id: overview.attempt_id,
        test_id: overview.test_id,
        student_id: overview.student_id,
        test_title: overview.test_title ?? "Unknown",
        student_name: overview.student_name ?? "Unknown",
        class_id: overview.class_id ?? "",
        class_name: overview.class_name ?? "",
        attempt_status: overview.attempt_status,
        result_status: overview.result_status,
        total_score: overview.total_score,
        released_at: overview.released_at,
        started_at: overview.started_at,
        submitted_at: overview.submitted_at,
        time_limit_minutes: overview.time_limit_minutes ?? 30,
        total_possible_points: overview.total_possible_points ?? 0,
        essay_total: overview.essay_total ?? 0,
        essays_graded: overview.essays_graded ?? 0,
      }) : null;
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
        attempt_view: view,
      };
    });

    return NextResponse.json(enriched);
  } catch (e: any) {
    console.error("Grading error:", e);
    return NextResponse.json({ error: e.message ?? "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { answer_id, manual_score, rubric_scores } = await req.json();
  if (!answer_id) {
    return NextResponse.json({ error: "answer_id is required" }, { status: 400 });
  }

  const updateData: any = { graded_by: user.id, graded_at: new Date().toISOString() };

  if (Array.isArray(rubric_scores) && rubric_scores.length > 0) {
    updateData.rubric_scores = rubric_scores;
    updateData.manual_score = rubric_scores.reduce((sum: number, s: any) => sum + (Number(s.score) || 0), 0);
  } else if (typeof manual_score === "number") {
    updateData.manual_score = manual_score;
  } else {
    return NextResponse.json({ error: "manual_score or rubric_scores is required" }, { status: 400 });
  }

  const { error } = await db
    .from("answers")
    .update(updateData)
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
