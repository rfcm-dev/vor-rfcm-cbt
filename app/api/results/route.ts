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
    if (!classRow) {
      console.log("[results/public] class not found", { className, classCode });
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }
    console.log("[results/public] class found", { classId: classRow.id, className, classCode });

    const trimmedName = studentName.trim();
    const { data: students } = await db
      .from("students")
      .select("id, name")
      .eq("class_id", classRow.id)
      .ilike("name", trimmedName + "%")
      .limit(5);

    console.log("[results/public] student lookup", { trimmedName, students });

    const student = students?.[0];
    if (!student) {
      return NextResponse.json({
        error: "Student not found",
        debug: {
          class_id: classRow.id,
          class_name: className,
          student_name_queried: trimmedName,
          students_found: students?.length ?? 0,
          students_sample: students?.slice(0, 5).map((s: any) => ({ id: s.id, name: s.name })) ?? [],
        }
      }, { status: 404 });
    }

    console.log("[results/public] student matched", { studentId: student.id, studentName: student.name });

    const { data: attempts } = await db
      .from("attempts")
      .select("id, test_id")
      .eq("student_id", student.id);

    console.log("[results/public] attempts", { count: attempts?.length ?? 0, ids: attempts?.map((a: any) => a.id) });

    if (!attempts || attempts.length === 0) {
      return NextResponse.json({
        error: "No attempts found for this student",
        debug: { student_id: student.id, student_name: student.name }
      }, { status: 404 });
    }

    const testIds = [...new Set(attempts.map((a: any) => a.test_id))];

    const { data: results } = await db
      .from("results")
      .select("*")
      .in("attempt_id", (attempts ?? []).map((a: any) => a.id))
      .eq("status", "released");

    console.log("[results/public] released results", { count: results?.length ?? 0, ids: results?.map((r: any) => r.attempt_id), statuses: results?.map((r: any) => r.status) });

    const { data: matchedAttempts } = results?.length
      ? await db.from("attempts").select("id, test_id, student_id").in("id", (results ?? []).map((r: any) => r.attempt_id))
      : { data: [] as any[] };
    const attemptMap = Object.fromEntries((matchedAttempts ?? []).map((a: any) => [a.id, a]));

    const filteredResults = (results ?? []).filter((r: any) => {
      const attempt = attemptMap[r.attempt_id];
      return attempt?.test_id && testIds.includes(attempt.test_id) && attempt.student_id === student.id;
    });

    if (filteredResults.length === 0 && (results ?? []).length > 0) {
      return NextResponse.json({
        error: "Released results exist but do not match this student/test combination.",
        debug: {
          student_id: student.id,
          student_name: studentName,
          class_id: classRow.id,
          class_name: className,
          total_attempts: attempts.length,
          attempt_ids: attempts.map((a: any) => a.id),
          total_released_results: (results ?? []).length,
          released_result_attempt_ids: (results ?? []).map((r: any) => r.attempt_id),
          matched_attempts: matchedAttempts?.length ?? 0,
          test_ids: testIds,
        }
      }, { status: 404 });
    }

    if (filteredResults.length === 0) return NextResponse.json([]);

    const { data: tests } = await db.from("tests").select("id, title").in("id", testIds);
    const titleMap = Object.fromEntries((tests ?? []).map((t: any) => [t.id, t.title]));

    const enriched = filteredResults.map((r: any) => {
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

  const { data: testAttempts } = await db.from("attempts").select("id").eq("test_id", testId);
  const attemptIds = (testAttempts ?? []).map((a: any) => a.id);

  const { data: results, error } = await db
    .from("results")
    .select("*")
    .in("attempt_id", attemptIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const attemptIdsFromResults = Array.from(new Set((results ?? []).map((r: any) => r.attempt_id).filter(Boolean)));
  const { data: attempts } = attemptIdsFromResults.length > 0
    ? await db.from("attempts").select("id, student_id").in("id", attemptIdsFromResults)
    : { data: [] as any[] };
  const studentIds = Array.from(new Set((attempts ?? []).map((a: any) => a.student_id).filter(Boolean)));
  const { data: students } = studentIds.length > 0
    ? await db.from("students").select("id, name").in("id", studentIds)
    : { data: [] as any[] };

  const attemptMap = Object.fromEntries((attempts ?? []).map((a: any) => [a.id, a]));
  const studentMap = Object.fromEntries((students ?? []).map((s: any) => [s.id, s]));

  const enriched = (results ?? []).map((r: any) => {
    const attempt = attemptMap[r.attempt_id];
    const student = studentMap[attempt?.student_id];
    return {
      ...r,
      attempts: attempt ? { ...attempt, students: student ? { ...student } : null } : null,
    };
  });

  return NextResponse.json(enriched);
}
