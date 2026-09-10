export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scoreToGrade } from "@/lib/grade";

export async function GET(req: NextRequest) {
  const publicCheck = req.nextUrl.searchParams.get("public");

  if (publicCheck) {
    const className = req.nextUrl.searchParams.get("class_name")?.trim();
    const classCode = req.nextUrl.searchParams.get("class_code")?.trim();
    const studentName = req.nextUrl.searchParams.get("student_name")?.trim();

    if (!className || !studentName) {
      return NextResponse.json({ error: "class_name and student_name are required" }, { status: 400 });
    }

    let classQuery = db.from("classes").select("id").eq("name", className);
    if (classCode) classQuery = classQuery.eq("class_code", classCode);

    const { data: classRow } = await classQuery.maybeSingle();
    if (!classRow) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const { data: students } = await db
      .from("students")
      .select("id")
      .eq("class_id", classRow.id)
      .eq("name", studentName)
      .limit(1);

    const student = students?.[0];
    if (!student) return NextResponse.json([]);

    const { data: attempts } = await db
      .from("attempts")
      .select("id, test_id")
      .eq("student_id", student.id);

    if (!attempts || attempts.length === 0) return NextResponse.json([]);

    const testIds = [...new Set(attempts.map((a: any) => a.test_id))];

    const { data: results } = await db
      .from("results")
      .select("*, attempts!inner(test_id, student_id)")
      .in("attempts.test_id", testIds)
      .eq("status", "released")
      .eq("attempts.student_id", student.id);

    if (!results || results.length === 0) return NextResponse.json([]);

    const { data: tests } = await db.from("tests").select("id, title").in("id", testIds);
    const titleMap = Object.fromEntries((tests ?? []).map((t: any) => [t.id, t.title]));

    const enriched = results.map((r: any) => {
      const attempt = attempts.find((a: any) => a.id === r.attempt_id);
      return { ...r, test_title: titleMap[attempt?.test_id ?? ""] ?? "" };
    });

    const questionsPromises = testIds.map((tid: string) =>
      db.from("questions").select("points").eq("test_id", tid)
    );
    const questionsResults = await Promise.all(questionsPromises);
    const pointsMap: Record<string, number> = {};
    testIds.forEach((tid, i) => {
      pointsMap[tid] = (questionsResults[i].data ?? []).reduce((sum, q) => sum + Number(q.points ?? 0), 0);
    });

    const final = enriched.map((r: any) => {
      const attempt = attempts.find((a: any) => a.id === r.attempt_id);
      const totalPossible = pointsMap[attempt?.test_id ?? ""] ?? 0;
      const percentage = totalPossible > 0 ? Math.round(((r.total_score ?? 0) / totalPossible) * 100) : 0;
      return { ...r, total_score: percentage, raw_score: r.total_score, grade: scoreToGrade(percentage) };
    });

    return NextResponse.json(final);
  }

  const testId = req.nextUrl.searchParams.get("test_id");
  if (!testId) return NextResponse.json({ error: "test_id is required" }, { status: 400 });

  const { data, error } = await db
    .from("results")
    .select("*, attempts!inner(test_id, student_id, students(name))")
    .eq("attempts.test_id", testId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
