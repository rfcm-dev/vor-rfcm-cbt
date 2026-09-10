export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { WorksheetDocument } from "@/lib/pdf";

export async function GET(req: NextRequest) {
  const attemptId = req.nextUrl.searchParams.get("attempt_id");
  if (!attemptId) return NextResponse.json({ error: "attempt_id is required" }, { status: 400 });

  const { data: attempt, error: attemptError } = await db
    .from("attempts")
    .select("*")
    .eq("id", attemptId)
    .single();
  if (attemptError || !attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });

  const studentIds = attempt.student_id ? [attempt.student_id] : [];
  const { data: students } = studentIds.length > 0
    ? await db.from("students").select("id, name, class_id").in("id", studentIds)
    : { data: [] as any[] };
  const classIds = (students ?? []).map((s: any) => s.class_id).filter(Boolean);
  const { data: classes } = classIds.length > 0
    ? await db.from("classes").select("id, name").in("id", classIds)
    : { data: [] as any[] };

  const testIds = attempt.test_id ? [attempt.test_id] : [];
  const { data: tests } = testIds.length > 0
    ? await db.from("tests").select("id, title").in("id", testIds)
    : { data: [] as any[] };

  const studentMap = Object.fromEntries((students ?? []).map((s: any) => [s.id, s]));
  const classMap = Object.fromEntries((classes ?? []).map((c: any) => [c.id, c]));
  const testMap = Object.fromEntries((tests ?? []).map((t: any) => [t.id, t]));

  const { data: answers, error } = await db
    .from("answers")
    .select("*")
    .eq("attempt_id", attemptId);

  const questionIds = Array.from(new Set((answers ?? []).map((a: any) => a.question_id).filter(Boolean)));
  const { data: questions } = questionIds.length > 0
    ? await db.from("questions").select("id, content, type, correct_answer, points, order_index").in("id", questionIds)
    : { data: [] as any[] };
  const questionMap = Object.fromEntries((questions ?? []).map((q: any) => [q.id, q]));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const student = studentMap[attempt.student_id];
  const cls = classMap[student?.class_id];
  const test = testMap[attempt.test_id];

  const sorted = (answers ?? [])
    .sort((a, b) => (questionMap[a.question_id]?.order_index ?? 0) - (questionMap[b.question_id]?.order_index ?? 0))
    .map((a) => ({
      content: questionMap[a.question_id]?.content ?? "",
      type: questionMap[a.question_id]?.type ?? "",
      response: a.response,
      correct_answer: questionMap[a.question_id]?.correct_answer ?? null,
      auto_score: a.auto_score,
      manual_score: a.manual_score,
      points: questionMap[a.question_id]?.points ?? 0,
    }));

  const buffer = await renderToBuffer(
    WorksheetDocument({
      studentName: student?.name ?? "",
      className: cls?.name ?? "",
      testTitle: test?.title ?? "",
      answers: sorted,
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="worksheet-${(student?.name ?? "student").replace(/\s+/g, "-")}.pdf"`,
    },
  });
}
