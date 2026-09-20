export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAttemptOverview } from "@/lib/attempt-overview";
import { deriveAttemptView } from "@/lib/attempt-status";

export async function GET(req: NextRequest) {
  const publicCheck = req.nextUrl.searchParams.get("public");

  if (publicCheck) {
    const className = req.nextUrl.searchParams.get("class_name")?.trim();
    const classCode = req.nextUrl.searchParams.get("class_code")?.trim();
    const studentName = req.nextUrl.searchParams.get("student_name")?.trim();

    if (!className || !studentName) {
      return NextResponse.json({ error: "class_name and student_name are required" }, { status: 400 });
    }

    let classQuery = db.from("classes").select("id").ilike("name", className);
    if (classCode) classQuery = classQuery.ilike("class_code", classCode);

    const { data: classRow } = await classQuery.maybeSingle();
    if (!classRow) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const trimmedName = studentName.trim();
    const { data: students } = await db
      .from("students")
      .select("id")
      .eq("class_id", classRow.id)
      .ilike("name", trimmedName + "%")
      .limit(1);

    const student = students?.[0];
    if (!student) return NextResponse.json([]);

    const overview = await getAttemptOverview({
      studentId: student.id,
      resultStatus: "released",
    });

    const mapped = overview.map((a: any) => {
      const view = deriveAttemptView({
        attempt_id: a.attempt_id,
        test_id: a.test_id,
        student_id: a.student_id,
        test_title: a.test_title ?? "Unknown",
        student_name: a.student_name ?? "Unknown",
        class_id: a.class_id ?? "",
        class_name: a.class_name ?? "",
        attempt_status: a.attempt_status,
        result_status: a.result_status,
        total_score: a.total_score,
        released_at: a.released_at,
        started_at: a.started_at,
        submitted_at: a.submitted_at,
        time_limit_minutes: a.time_limit_minutes ?? 30,
        total_possible_points: a.total_possible_points ?? 0,
        essay_total: a.essay_total ?? 0,
        essays_graded: a.essays_graded ?? 0,
      });
      return {
        id: a.attempt_id,
        test_title: a.test_title,
        percentage: view.percentage,
        grade: view.grade,
        status: a.result_status,
      };
    });

    return NextResponse.json(mapped);
  }

  const testId = req.nextUrl.searchParams.get("test_id");
  if (!testId) return NextResponse.json({ error: "test_id is required" }, { status: 400 });

  const overview = await getAttemptOverview({
    testId,
    includeInProgress: true,
  });

  const mapped = overview.map((a: any) => {
    const view = deriveAttemptView({
      attempt_id: a.attempt_id,
      test_id: a.test_id,
      student_id: a.student_id,
      test_title: a.test_title ?? "Unknown",
      student_name: a.student_name ?? "Unknown",
      class_id: a.class_id ?? "",
      class_name: a.class_name ?? "",
      attempt_status: a.attempt_status,
      result_status: a.result_status,
      total_score: a.total_score,
      released_at: a.released_at,
      started_at: a.started_at,
      submitted_at: a.submitted_at,
      time_limit_minutes: a.time_limit_minutes ?? 30,
      total_possible_points: a.total_possible_points ?? 0,
      essay_total: a.essay_total ?? 0,
      essays_graded: a.essays_graded ?? 0,
    });
    return {
      ...a,
      attempts: {
        id: a.attempt_id,
        student_id: a.student_id,
        students: {
          name: a.student_name,
        },
      },
      view,
    };
  });

  return NextResponse.json(mapped);
}
