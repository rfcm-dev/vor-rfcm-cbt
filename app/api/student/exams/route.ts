export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/student-session";
import { getAttemptOverview } from "@/lib/attempt-overview";
import { deriveAttemptView } from "@/lib/attempt-status";

export async function GET() {
  try {
    const student = await getStudentSession();
    if (!student) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: studentRow } = await db.from("students").select("class_id").eq("id", student.id).single();
    const classId = studentRow?.class_id;

    const overview = await getAttemptOverview({
      studentId: student.id,
      includeInProgress: true,
    });

    const attemptedTestIds = new Set((overview ?? []).map((a: any) => a.test_id).filter(Boolean));

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
        view: null,
      }));

    const attempted = (overview ?? [])
      .filter((a: any) => a.attempt_status !== "not_started")
      .map((a: any) => {
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
          test_id: a.test_id,
          title: a.test_title ?? "Unknown",
          status: view.status,
          started_at: a.started_at,
          submitted_at: a.submitted_at,
          result: null,
          view,
        };
      });

    return NextResponse.json({ exams: [...available, ...attempted] });
  } catch (e: any) {
    console.error("Student exams error:", e);
    return NextResponse.json({ error: e.message ?? "Internal server error" }, { status: 500 });
  }
}
