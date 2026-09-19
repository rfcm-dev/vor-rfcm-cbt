export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { scoreToGrade } from "@/lib/grade";

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

    let resultsQuery = db.from("results").select("id, attempt_id, total_score, status, released_at, created_at", { count: "exact" }).eq("status", status).order("created_at", { ascending: false }).range(from, to);
    const { data: results, count, error: resultsError } = await resultsQuery;
    if (resultsError) return NextResponse.json({ error: resultsError.message }, { status: 500 });

    const resultIds = (results ?? []).map((r: any) => r.id);
    const attemptIds = Array.from(new Set((results ?? []).map((r: any) => r.attempt_id).filter(Boolean)));

    const [
      { data: attempts },
      { data: questions },
    ] = await Promise.all([
      attemptIds.length > 0 ? db.from("attempts").select("id, student_id, test_id, submitted_at").in("id", attemptIds) : { data: [] as any[] },
      testId ? db.from("questions").select("test_id, points").eq("test_id", testId) : { data: [] as any[] },
    ]);

    const studentIds = Array.from(new Set((attempts ?? []).map((a: any) => a.student_id).filter(Boolean)));
    const testIds = Array.from(new Set((attempts ?? []).map((a: any) => a.test_id).filter(Boolean)));

    const classIdsFromStudents = studentIds.length > 0
      ? Array.from(new Set((await db.from("students").select("class_id").in("id", studentIds)).data?.map((s: any) => s.class_id).filter(Boolean) ?? []))
      : [];

    const [
      { data: students },
      { data: tests },
      { data: classes },
    ] = await Promise.all([
      studentIds.length > 0 ? db.from("students").select("id, name, class_id").in("id", studentIds) : { data: [] as any[] },
      testIds.length > 0 ? db.from("tests").select("id, title").in("id", testIds) : { data: [] as any[] },
      classIdsFromStudents.length > 0 ? db.from("classes").select("id, name").in("id", classIdsFromStudents) : { data: [] as any[] },
    ]);

    const pointsByTest: Record<string, number> = {};
    for (const q of questions ?? []) {
      pointsByTest[q.test_id] = (pointsByTest[q.test_id] ?? 0) + Number(q.points ?? 0);
    }

    const attemptMap = Object.fromEntries((attempts ?? []).map((a: any) => [a.id, a]));
    const studentMap = Object.fromEntries((students ?? []).map((s: any) => [s.id, s]));
    const testMap = Object.fromEntries((tests ?? []).map((t: any) => [t.id, t]));
    const classMap = Object.fromEntries((classes ?? []).map((c: any) => [c.id, c]));

    const enriched = (results ?? [])
      .map((r: any) => {
        const attempt = attemptMap[r.attempt_id];
        if (!attempt) return null;
        const student = studentMap[attempt.student_id];
        if (!student) return null;
        const test = testMap[attempt.test_id];
        if (!test) return null;
        const cls = classMap[student.class_id];
        if (!cls) return null;
        const totalPossible = pointsByTest[test.id] ?? 0;
        const percentage = totalPossible > 0 ? Math.round(((r.total_score ?? 0) / totalPossible) * 100) : 0;
        return {
          attempt_id: r.attempt_id,
          result_id: r.id,
          student_id: student.id,
          student_name: student.name,
          class_id: cls.id,
          class_name: cls.name,
          test_id: test.id,
          test_title: test.title,
          total_score: r.total_score,
          total_possible: totalPossible,
          percentage,
          grade: scoreToGrade(percentage),
          status: r.status,
          released_at: r.released_at,
          submitted_at: attempt.submitted_at,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ results: enriched, count: count ?? 0, page, limit });
  } catch (e: any) {
    console.error("Admin results error:", e);
    return NextResponse.json({ error: e.message || "Internal server error" }, { status: 500 });
  }
}
