export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/student-session";

export async function GET() {
  const student = await getStudentSession();
  if (!student) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: results } = await db
    .from("attempt_overview")
    .select(`
      attempt_id,
      test_id,
      test_title,
      total_score,
      percentage,
      grade,
      result_status,
      submitted_at
    `)
    .eq("student_id", student.id)
    .eq("result_status", "released")
    .order("submitted_at", { ascending: false });

  const mapped = (results ?? []).map((r: any) => ({
    id: r.attempt_id,
    test_id: r.test_id,
    test_title: r.test_title,
    total_score: r.total_score,
    percentage: r.percentage,
    grade: r.grade,
    status: r.result_status,
    submitted_at: r.submitted_at,
  }));

  return NextResponse.json({ results: mapped });
}
