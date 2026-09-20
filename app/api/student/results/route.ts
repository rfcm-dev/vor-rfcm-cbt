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

    const { data: results } = await db
      .from("attempt_overview")
      .select(`
        attempt_id,
        test_id,
        test_title,
        total_score,
        result_status,
        submitted_at
      `)
      .eq("student_id", student.id)
      .eq("result_status", "released")
      .order("submitted_at", { ascending: false });

    const testIds = [...new Set((results ?? []).map((r: any) => r.test_id).filter(Boolean))];
    const { data: questions } = testIds.length > 0
      ? await db.from("questions").select("test_id, points").in("test_id", testIds)
      : { data: [] as any[] };
    const pointsMap: Record<string, number> = {};
    for (const q of questions ?? []) {
      pointsMap[q.test_id] = (pointsMap[q.test_id] ?? 0) + Number(q.points ?? 0);
    }

    const overview = await getAttemptOverview({
      studentId: student.id,
      resultStatus: "released",
    });
    const overviewMap = new Map((overview ?? []).map((o: any) => [o.attempt_id, o]));

    const mapped = (results ?? []).map((r: any) => {
      const overviewRow = overviewMap.get(r.attempt_id);
      const view = overviewRow ? deriveAttemptView({
        attempt_id: overviewRow.attempt_id,
        test_id: overviewRow.test_id,
        student_id: overviewRow.student_id,
        test_title: overviewRow.test_title ?? "Unknown",
        student_name: overviewRow.student_name ?? "Unknown",
        class_id: overviewRow.class_id ?? "",
        class_name: overviewRow.class_name ?? "",
        attempt_status: overviewRow.attempt_status,
        result_status: overviewRow.result_status,
        total_score: overviewRow.total_score,
        released_at: overviewRow.released_at,
        started_at: overviewRow.started_at,
        submitted_at: overviewRow.submitted_at,
        time_limit_minutes: overviewRow.time_limit_minutes ?? 30,
        total_possible_points: overviewRow.total_possible_points ?? 0,
        essay_total: overviewRow.essay_total ?? 0,
        essays_graded: overviewRow.essays_graded ?? 0,
      }) : null;
      return {
        id: r.attempt_id,
        test_id: r.test_id,
        test_title: r.test_title,
        total_score: r.total_score,
        percentage: view?.percentage ?? null,
        grade: view?.grade ?? null,
        status: r.result_status,
        submitted_at: r.submitted_at,
      };
    });

    return NextResponse.json({ results: mapped });
  } catch (e: any) {
    console.error("Student results error:", e);
    return NextResponse.json({ error: e.message ?? "Internal server error" }, { status: 500 });
  }
}
