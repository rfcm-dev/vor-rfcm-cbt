import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

// GET: list ungraded essay answers (the grading queue), optionally filtered by test_id.
// POST: submit a manual score for one essay answer.
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  const testId = req.nextUrl.searchParams.get("test_id");
  const includeGraded = req.nextUrl.searchParams.get("all") === "1" && user?.role === "superadmin";

  let query = db
    .from("answers")
    .select("*, questions!inner(type, content, points, test_id), attempts!inner(student_id, students(name))")
    .eq("questions.type", "essay");

  if (!includeGraded) query = query.is("manual_score", null);
  if (testId) query = query.eq("questions.test_id", testId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
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
  if (answer) {
    const { data: allAnswers } = await db.from("answers").select("*, questions!inner(type)").eq("attempt_id", answer.attempt_id);
    const stillPending = (allAnswers ?? []).some((a: any) => a.questions.type === "essay" && a.manual_score === null);

    if (!stillPending) {
      const total = (allAnswers ?? []).reduce(
        (sum: number, a: any) => sum + (a.manual_score ?? a.auto_score ?? 0),
        0
      );
      await db
        .from("results")
        .update({ total_score: total, status: "graded" })
        .eq("attempt_id", answer.attempt_id);
    }
  }

  return NextResponse.json({ ok: true });
}
