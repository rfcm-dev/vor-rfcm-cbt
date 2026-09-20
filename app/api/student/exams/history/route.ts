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

    const overview = await getAttemptOverview({
      studentId: student.id,
      includeInProgress: true,
    });

    const mapped = (overview ?? []).map((a: any) => {
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
        test_title: a.test_title ?? "Unknown",
        status: view.status,
        started_at: a.started_at,
        submitted_at: a.submitted_at,
        total_score: a.total_score,
        percentage: view.percentage,
        grade: view.grade,
        result_status: a.result_status ?? "pending",
      };
    });

    return NextResponse.json({ attempts: mapped });
  } catch (e: any) {
    console.error("Student history error:", e);
    return NextResponse.json({ error: e.message ?? "Internal server error" }, { status: 500 });
  }
}
