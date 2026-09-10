export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { ResultDocument } from "@/lib/pdf";
import { scoreToGrade } from "@/lib/grade";

export async function GET(req: NextRequest) {
  const attemptId = req.nextUrl.searchParams.get("attempt_id");
  if (!attemptId) return NextResponse.json({ error: "attempt_id is required" }, { status: 400 });

  const { data: result, error } = await db
    .from("results")
    .select("*")
    .eq("attempt_id", attemptId)
    .single();

  if (error || !result) return NextResponse.json({ error: "Result not found" }, { status: 404 });
  if (result.status !== "released") {
    return NextResponse.json({ error: "This result has not been released yet" }, { status: 403 });
  }

  const { data: attempt } = result.attempt_id
    ? await db.from("attempts").select("id, student_id, test_id").eq("id", result.attempt_id).maybeSingle()
    : { data: null as any };

  const studentIds = attempt?.student_id ? [attempt.student_id] : [];
  const { data: students } = studentIds.length > 0
    ? await db.from("students").select("id, name, class_id").in("id", studentIds)
    : { data: [] as any[] };
  const classIds = (students ?? []).map((s: any) => s.class_id).filter(Boolean);
  const { data: classes } = classIds.length > 0
    ? await db.from("classes").select("id, name").in("id", classIds)
    : { data: [] as any[] };

  const testIds = attempt?.test_id ? [attempt.test_id] : [];
  const { data: tests } = testIds.length > 0
    ? await db.from("tests").select("id, title").in("id", testIds)
    : { data: [] as any[] };

  const studentMap = Object.fromEntries((students ?? []).map((s: any) => [s.id, s]));
  const classMap = Object.fromEntries((classes ?? []).map((c: any) => [c.id, c]));
  const testMap = Object.fromEntries((tests ?? []).map((t: any) => [t.id, t]));

  const student = studentMap[attempt?.student_id];
  const cls = classMap[student?.class_id];
  const test = testMap[attempt?.test_id];

  const enrichedResult = {
    ...result,
    attempts: attempt ? {
      student_id: attempt.student_id,
      test_id: attempt.test_id,
      students: student ? { name: student.name, classes: cls ? { name: cls.name } : null } : null,
      tests: test ? { title: test.title } : null,
    } : null,
  };

  const { data: questions } = await db.from("questions").select("points").eq("test_id", enrichedResult.attempts?.test_id ?? "");
  const totalPossible = (questions ?? []).reduce((sum, q) => sum + Number(q.points ?? 0), 0);
  const percentage = totalPossible > 0 ? Math.round(((enrichedResult.total_score ?? 0) / totalPossible) * 100) : 0;

  const buffer = await renderToBuffer(
    ResultDocument({
      studentName: enrichedResult.attempts?.students?.name ?? "",
      className: enrichedResult.attempts?.students?.classes?.name ?? "",
      testTitle: enrichedResult.attempts?.tests?.title ?? "",
      percentage,
      grade: scoreToGrade(percentage),
      releasedAt: new Date(enrichedResult.released_at).toLocaleDateString(),
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="result-${(enrichedResult.attempts?.students?.name ?? "student").replace(/\s+/g, "-")}.pdf"`,
    },
  });
}
