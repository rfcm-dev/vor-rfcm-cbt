export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();

  const { data: activeTests } = await db.from("tests").select("id, opens_at, closes_at").eq("status", "active");

  const openCount = (activeTests ?? []).filter((t: any) => {
    if (t.opens_at && new Date(t.opens_at) > now) return false;
    if (t.closes_at && new Date(t.closes_at) < now) return false;
    return true;
  }).length;

  const { count: pendingGrading } = await db
    .from("answers")
    .select("*", { count: "exact", head: true })
    .is("manual_score", null)
    .eq("questions.type", "essay");

  const { count: pendingRelease } = await db
    .from("results")
    .select("*", { count: "exact", head: true })
    .eq("status", "graded");

  const { count: totalClasses } = await db.from("classes").select("*", { count: "exact", head: true });
  const { count: totalExams } = await db.from("tests").select("*", { count: "exact", head: true });

  return NextResponse.json({
    open_exams_count: openCount,
    pending_grading_count: pendingGrading ?? 0,
    pending_release_count: pendingRelease ?? 0,
    total_classes: totalClasses ?? 0,
    total_exams: totalExams ?? 0,
  });
}
