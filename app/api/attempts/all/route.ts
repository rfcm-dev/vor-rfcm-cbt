export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const testId = req.nextUrl.searchParams.get("test_id");
  const classId = req.nextUrl.searchParams.get("class_id");
  const resultStatus = req.nextUrl.searchParams.get("status");

  let query = db
    .from("attempts")
    .select("id, student_id, started_at, submitted_at, status, late_seconds")
    .in("status", ["submitted", "auto_submitted"])
    .order("submitted_at", { ascending: false });

  if (testId) query = query.eq("test_id", testId);

  const { data: attempts, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const studentIds = Array.from(new Set((attempts ?? []).map((a: any) => a.student_id).filter(Boolean)));
  const { data: students } = studentIds.length > 0
    ? await db.from("students").select("id, name, class_id").in("id", studentIds)
    : { data: [] as any[] };
  const classIds = Array.from(new Set((students ?? []).map((s: any) => s.class_id).filter(Boolean)));
  const { data: classes } = classIds.length > 0
    ? await db.from("classes").select("id, name").in("id", classIds)
    : { data: [] as any[] };

  const testIds = Array.from(new Set((attempts ?? []).map((a: any) => a.test_id).filter(Boolean)));
  const { data: tests } = testIds.length > 0
    ? await db.from("tests").select("id, title").in("id", testIds)
    : { data: [] as any[] };

  const attemptIds = (attempts ?? []).map((a: any) => a.id);
  const { data: results } = attemptIds.length > 0
    ? await db.from("results").select("attempt_id, total_score, status").in("attempt_id", attemptIds)
    : { data: [] as any[] };

  const studentMap = Object.fromEntries((students ?? []).map((s: any) => [s.id, s]));
  const classMap = Object.fromEntries((classes ?? []).map((c: any) => [c.id, c]));
  const testMap = Object.fromEntries((tests ?? []).map((t: any) => [t.id, t]));
  const resultMap = Object.fromEntries((results ?? []).map((r: any) => [r.attempt_id, r]));

  const enriched = (attempts ?? []).map((a: any) => {
    const student = studentMap[a.student_id];
    const cls = classMap[student?.class_id];
    const result = resultMap[a.id];
    return {
      id: a.id,
      student_name: student?.name ?? "Unknown",
      class_name: cls?.name ?? "",
      test_title: testMap[a.test_id]?.title ?? "Unknown",
      started_at: a.started_at,
      submitted_at: a.submitted_at,
      status: a.status,
      late_seconds: a.late_seconds ?? 0,
      result: result ? { total_score: result.total_score, status: result.status } : null,
    };
  });

  const filtered = classId
    ? enriched.filter((a) => {
        const student = studentMap[(attempts ?? []).find((at: any) => at.id === a.id)?.student_id ?? ""];
        return student?.class_id === classId;
      })
    : enriched;

  const filteredByResultStatus = resultStatus
    ? filtered.filter((a) => a.result?.status === resultStatus)
    : filtered;

  return NextResponse.json(filtered);
}
