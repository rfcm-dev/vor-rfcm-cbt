export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();

  const [
    { data: activeTests },
    { data: essayQuestions },
    { count: pendingRelease },
    { count: totalClasses },
    { count: totalExams },
  ] = await Promise.all([
    db.from("tests").select("id, opens_at, closes_at").eq("status", "active"),
    db.from("questions").select("id").eq("type", "essay"),
    db.from("results").select("*", { count: "exact", head: true }).eq("status", "graded"),
    db.from("classes").select("*", { count: "exact", head: true }),
    db.from("tests").select("*", { count: "exact", head: true }),
  ]);

  const essayQuestionIds = (essayQuestions ?? []).map((q: any) => q.id);
  const { count: pendingGrading } = await db
    .from("answers")
    .select("*", { count: "exact", head: true })
    .is("manual_score", null)
    .in("question_id", essayQuestionIds);

  const openCount = (activeTests ?? []).filter((t: any) => {
    if (t.opens_at && new Date(t.opens_at) > now) return false;
    if (t.closes_at && new Date(t.closes_at) < now) return false;
    return true;
  }).length;

  return NextResponse.json({
    open_exams_count: openCount,
    pending_grading_count: pendingGrading ?? 0,
    pending_release_count: pendingRelease ?? 0,
    total_classes: totalClasses ?? 0,
    total_exams: totalExams ?? 0,
  });
}
