export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/student-session";

export async function GET() {
  const student = await getStudentSession();
  if (!student) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: studentRow } = await db.from("students").select("class_id").eq("id", student.id).single();
  const classId = studentRow?.class_id;

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

  const attemptedTestIds = new Set((attempts ?? []).map((a: any) => a.test_id));

  let availableTests: any[] = [];
  if (classId) {
    const { data: tcRows } = await db.from("test_classes").select("test_id").eq("class_id", classId);
    const testIds = (tcRows ?? []).map((r: any) => r.test_id);
    const { data: tests } = testIds.length > 0
      ? await db.from("tests").select("id, title, status, opens_at, closes_at").in("id", testIds).eq("status", "active")
      : { data: [] as any[] };

    const now = new Date();
    availableTests = (tests ?? []).filter((t: any) => {
      if (t.opens_at && new Date(t.opens_at) > now) return false;
      if (t.closes_at && new Date(t.closes_at) < now) return false;
      return true;
    });
  }

  const available = availableTests
    .filter((t: any) => !attemptedTestIds.has(t.id))
    .map((t: any) => ({
      id: null,
      test_id: t.id,
      title: t.title,
      status: "not_started",
      started_at: null,
      submitted_at: null,
      result: null,
    }));

  const attempted = (attempts ?? []).map((a: any) => ({
    id: a.id,
    test_id: a.test_id,
    title: a.tests?.title ?? "Unknown",
    status: a.status,
    started_at: a.started_at,
    submitted_at: a.submitted_at,
    result: null,
  }));

  return NextResponse.json({ exams: [...available, ...attempted] });
}
