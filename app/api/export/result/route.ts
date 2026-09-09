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
    .select("*, attempts!inner(student_id, test_id, students(name, classes(name)), tests(title))")
    .eq("attempt_id", attemptId)
    .single();

  if (error || !result) return NextResponse.json({ error: "Result not found" }, { status: 404 });
  if (result.status !== "released") {
    return NextResponse.json({ error: "This result has not been released yet" }, { status: 403 });
  }

  const { data: questions } = await db.from("questions").select("points").eq("test_id", result.attempts.test_id);
  const totalPossible = (questions ?? []).reduce((sum, q) => sum + Number(q.points ?? 0), 0);
  const percentage = totalPossible > 0 ? Math.round(((result.total_score ?? 0) / totalPossible) * 100) : 0;

  const buffer = await renderToBuffer(
    ResultDocument({
      studentName: result.attempts.students.name,
      className: result.attempts.students.classes?.name ?? "",
      testTitle: result.attempts.tests.title,
      percentage,
      grade: scoreToGrade(percentage),
      releasedAt: new Date(result.released_at).toLocaleDateString(),
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="result-${result.attempts.students.name.replace(/\s+/g, "-")}.pdf"`,
    },
  });
}
