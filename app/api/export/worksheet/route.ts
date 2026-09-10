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
    .select("*, students(name, classes(name)), tests(title)")
    .eq("id", attemptId)
    .single();
  if (attemptError || !attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });

  const { data: answers, error } = await db
    .from("answers")
    .select("*, questions(content, type, correct_answer, points, order_index)")
    .eq("attempt_id", attemptId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sorted = (answers ?? [])
    .sort((a, b) => (a.questions?.order_index ?? 0) - (b.questions?.order_index ?? 0))
    .map((a) => ({
      content: a.questions?.content ?? "",
      type: a.questions?.type ?? "",
      response: a.response,
      correct_answer: a.questions?.correct_answer ?? null,
      auto_score: a.auto_score,
      manual_score: a.manual_score,
      points: a.questions?.points ?? 0,
    }));

  const buffer = await renderToBuffer(
    WorksheetDocument({
      studentName: attempt.students.name,
      className: attempt.students.classes?.name ?? "",
      testTitle: attempt.tests.title,
      answers: sorted,
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="worksheet-${attempt.students.name.replace(/\s+/g, "-")}.pdf"`,
    },
  });
}
