export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { getAttemptOverview } from "@/lib/attempt-overview";
import { deriveAttemptView } from "@/lib/attempt-status";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const testId = req.nextUrl.searchParams.get("test_id");
    const classId = req.nextUrl.searchParams.get("class_id");
    const resultStatus = req.nextUrl.searchParams.get("status");

    const attempts = await getAttemptOverview({
      testId: testId ?? undefined,
      classId: classId ?? undefined,
      resultStatus: resultStatus ?? undefined,
      includeInProgress: true,
    });

    const mapped = attempts.map((a: any) => {
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
        student_id: a.student_id,
        student_name: a.student_name ?? "Unknown",
        class_name: a.class_name ?? "",
        test_title: a.test_title ?? "Unknown",
        started_at: a.started_at,
        submitted_at: a.submitted_at ?? null,
        status: view.status,
        late_seconds: a.late_seconds ?? 0,
        isLate: view.isLate,
        lateMinutes: view.lateMinutes,
        percentage: view.percentage,
        grade: view.grade,
        canRelease: view.canRelease,
        essaysGraded: view.essaysGraded,
        essaysTotal: view.essaysTotal,
        result: a.result_id
          ? {
              total_score: a.total_score,
              percentage: view.percentage,
              grade: view.grade,
              status: a.result_status,
            }
          : null,
      };
    });

    return NextResponse.json(mapped);
  } catch (e: any) {
    console.error("Attempts all error:", e);
    return NextResponse.json({ error: e.message ?? "Internal server error" }, { status: 500 });
  }
}
