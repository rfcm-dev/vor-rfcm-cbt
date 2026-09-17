export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAttemptOverview } from "@/lib/attempt-overview";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const attempts = await getAttemptOverview({ testId: params.id });

    return NextResponse.json({
      count: attempts.length,
      attempts: attempts.map((a) => ({
        id: a.attempt_id,
        test_id: a.test_id,
        student_id: a.student_id,
        student_name: a.student_name ?? "Unknown",
        started_at: a.started_at,
        submitted_at: a.submitted_at,
        status: a.attempt_status,
        late_seconds: a.late_seconds ?? 0,
        result: a.result_id
          ? {
              total_score: a.total_score,
              status: a.result_status,
            }
          : null,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load attempts" }, { status: 500 });
  }
}
