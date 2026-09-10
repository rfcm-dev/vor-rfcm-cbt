export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import JSZip from "jszip";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { WorksheetDocument, ResultDocument } from "@/lib/pdf";
import { scoreToGrade } from "@/lib/grade";

// Bulk export for end-of-term reporting: every released result (or every
// worksheet) for a test, zipped into one download.
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const testId = req.nextUrl.searchParams.get("test_id");
  const type = req.nextUrl.searchParams.get("type") ?? "result"; // "result" | "worksheet"
  if (!testId) return NextResponse.json({ error: "test_id is required" }, { status: 400 });

  const { data: test } = await db.from("tests").select("title").eq("id", testId).single();
  const { data: questions } = await db.from("questions").select("points").eq("test_id", testId);
  const totalPossible = (questions ?? []).reduce((sum, q) => sum + Number(q.points ?? 0), 0);

  const { data: attempts } = await db
    .from("attempts")
    .select("id, student_id")
    .eq("test_id", testId);

  const studentIds = Array.from(new Set((attempts ?? []).map((a: any) => a.student_id).filter(Boolean)));
  const { data: students } = studentIds.length > 0
    ? await db.from("students").select("id, name, class_id").in("id", studentIds)
    : { data: [] as any[] };
  const classIds = (students ?? []).map((s: any) => s.class_id).filter(Boolean);
  const { data: classes } = classIds.length > 0
    ? await db.from("classes").select("id, name").in("id", classIds)
    : { data: [] as any[] };

  const studentMap = Object.fromEntries((students ?? []).map((s: any) => [s.id, s]));
  const classMap = Object.fromEntries((classes ?? []).map((c: any) => [c.id, c]));

  const zip = new JSZip();

  for (const attempt of attempts ?? []) {
    const student = studentMap[attempt.student_id];
    const studentName = student?.name ?? "student";
    const className = classMap[student?.class_id]?.name ?? "";
    const safeName = studentName.replace(/\s+/g, "-");

    if (type === "worksheet") {
      const { data: answers } = await db
        .from("answers")
        .select("*")
        .eq("attempt_id", attempt.id);

      const questionIds = Array.from(new Set((answers ?? []).map((a: any) => a.question_id).filter(Boolean)));
      const { data: questions } = questionIds.length > 0
        ? await db.from("questions").select("id, content, type, correct_answer, points, order_index").in("id", questionIds)
        : { data: [] as any[] };
      const questionMap = Object.fromEntries((questions ?? []).map((q: any) => [q.id, q]));

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
        WorksheetDocument({ studentName: studentName, className, testTitle: test?.title ?? "", answers: sorted })
      );
      zip.file(`worksheet-${safeName}.pdf`, buffer);
    } else {
      const { data: result } = await db
        .from("results")
        .select("*")
        .eq("attempt_id", attempt.id)
        .eq("status", "released")
        .maybeSingle();
      if (!result) continue; // skip anything not yet released for a "result" bulk export

      const percentage = totalPossible > 0 ? Math.round(((result.total_score ?? 0) / totalPossible) * 100) : 0;
      const buffer = await renderToBuffer(
        ResultDocument({
          studentName,
          className,
          testTitle: test?.title ?? "",
          percentage,
          grade: scoreToGrade(percentage),
          releasedAt: new Date(result.released_at).toLocaleDateString(),
        })
      );
      zip.file(`result-${safeName}.pdf`, buffer);
    }
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${type}s-${(test?.title ?? "export").replace(/\s+/g, "-")}.zip"`,
    },
  });
}
