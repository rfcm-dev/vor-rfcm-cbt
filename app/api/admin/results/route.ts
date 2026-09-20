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
    const status = req.nextUrl.searchParams.get("status") || "released";
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "25", 10)));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const overview = await getAttemptOverview({
      testId: testId ?? undefined,
      classId: classId ?? undefined,
      resultStatus: status,
    });

    const total = overview.length;
    const paginated = overview.slice(from, to);

    const enriched = paginated.map((a: any) => {
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
        attempt_id: a.attempt_id,
        result_id: a.result_id ?? a.attempt_id,
        student_id: a.student_id,
        student_name: a.student_name ?? "Unknown",
        class_id: a.class_id ?? "",
        class_name: a.class_name ?? "",
        test_id: a.test_id,
        test_title: a.test_title ?? "Unknown",
        total_score: a.total_score,
        total_possible: a.total_possible_points ?? 0,
        percentage: view.percentage ?? 0,
        grade: view.grade ?? "F",
        status: a.result_status ?? "pending",
        released_at: a.released_at,
        submitted_at: a.submitted_at,
      };
    });

    return NextResponse.json({ results: enriched, count: total, page, limit });
  } catch (e: any) {
    console.error("Admin results error:", e);
    return NextResponse.json({ error: e.message || "Internal server error" }, { status: 500 });
  }
}
