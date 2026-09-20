export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAttemptOverview } from "@/lib/attempt-overview";
import { deriveAttemptView } from "@/lib/attempt-status";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const attempts = await getAttemptOverview({ testId: params.id, includeInProgress: true });

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
        started_at: a.started_at,
        submitted_at: a.submitted_at,
        status: view.status,
        late_seconds: a.late_seconds ?? 0,
        isLate: view.isLate,
        lateMinutes: view.lateMinutes,
        percentage: view.percentage,
        grade: view.grade,
        canRelease: view.canRelease,
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

    return NextResponse.json({
      count: mapped.length,
      attempts: mapped,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load attempts" }, { status: 500 });
  }
}
