export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/student-session";

export async function GET() {
  const student = await getStudentSession();
  if (!student) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: attempts } = await db
    .from("attempts")
    .select(`
      id,
      test_id,
      status,
      started_at,
      submitted_at,
      tests ( title )
    `)
    .eq("student_id", student.id)
    .order("started_at", { ascending: false });

  const { data: results } = await db
    .from("results")
    .select("attempt_id, total_score, percentage, grade, status")
    .in("attempt_id", (attempts ?? []).map((a: any) => a.id));

  const resultMap = new Map((results ?? []).map((r: any) => [r.attempt_id, r]));

  const exams = (attempts ?? []).map((a: any) => {
    const result = resultMap.get(a.id);
    return {
      id: a.id,
      test_id: a.test_id,
      test_title: a.tests?.title ?? "Unknown",
      status: a.status,
      started_at: a.started_at,
      submitted_at: a.submitted_at,
      total_score: result?.total_score ?? null,
      percentage: result?.percentage ?? null,
      grade: result?.grade ?? null,
      result_status: result?.status ?? "pending",
    };
  });

  return NextResponse.json({ attempts: exams });
}
