export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const testId = req.nextUrl.searchParams.get("test_id");
  const classId = req.nextUrl.searchParams.get("class_id");
  const resultStatus = req.nextUrl.searchParams.get("status");

  let query = db
    .from("attempts")
    .select("id, student_id, started_at, submitted_at, status, late_seconds, students(name, classes(name)), tests(title), results(total_score, status)")
    .in("status", ["submitted", "auto_submitted"])
    .order("submitted_at", { ascending: false });

  if (testId) query = query.eq("test_id", testId);
  if (classId) query = query.eq("students.class_id", classId);

  const { data: attempts, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = (attempts ?? []).map((a: any) => ({
    id: a.id,
    student_name: a.students?.name ?? "Unknown",
    class_name: a.students?.classes?.name ?? "",
    test_title: a.tests?.title ?? "Unknown",
    started_at: a.started_at,
    submitted_at: a.submitted_at,
    status: a.status,
    late_seconds: a.late_seconds ?? 0,
    result: a.results ? { total_score: a.results.total_score, status: a.results.status } : null,
  }));

  const filtered = resultStatus
    ? enriched.filter((a) => a.result?.status === resultStatus)
    : enriched;

  return NextResponse.json(filtered);
}
