export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { getAttemptOverview } from "@/lib/attempt-overview";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const testId = req.nextUrl.searchParams.get("test_id");
  const classId = req.nextUrl.searchParams.get("class_id");
  const resultStatus = req.nextUrl.searchParams.get("status");

  const attempts = await getAttemptOverview({
    testId: testId ?? undefined,
    classId: classId ?? undefined,
    resultStatus: resultStatus ?? undefined,
  });

  const mapped = attempts.map((a: any) => ({
    id: a.attempt_id,
    test_id: a.test_id,
    student_id: a.student_id,
    student_name: a.student_name ?? "Unknown",
    class_name: a.class_name ?? "",
    test_title: a.test_title ?? "Unknown",
    started_at: a.started_at,
    submitted_at: a.submitted_at ?? null,
    status: a.attempt_status,
    late_seconds: a.late_seconds ?? 0,
    result: a.result_id
      ? {
          total_score: a.total_score,
          status: a.result_status,
        }
      : null,
  }));

  return NextResponse.json(mapped);
}
