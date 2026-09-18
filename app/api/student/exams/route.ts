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

  const exams = (attempts ?? []).map((a: any) => ({
    id: a.id,
    title: a.tests?.title ?? "Unknown",
    status: a.status,
    started_at: a.started_at,
    submitted_at: a.submitted_at,
    result: null,
  }));

  return NextResponse.json({ exams });
}
