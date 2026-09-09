import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data: attempts, error } = await db
    .from("attempts")
    .select("id, student_id, started_at, submitted_at, status, students(name)")
    .eq("test_id", params.id)
    .order("started_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const attemptIds = (attempts ?? []).map((a: any) => a.id);
  const { data: results } = attemptIds.length > 0
    ? await db.from("results").select("attempt_id, total_score, status").in("attempt_id", attemptIds)
    : { data: [] as any[] };

  const resultMap = Object.fromEntries((results ?? []).map((r: any) => [r.attempt_id, r]));

  const enriched = (attempts ?? []).map((a: any) => ({
    id: a.id,
    student_name: a.students?.name ?? "Unknown",
    started_at: a.started_at,
    submitted_at: a.submitted_at,
    status: a.status,
    result: resultMap[a.id] ?? null,
  }));

  return NextResponse.json({ count: enriched.length, attempts: enriched });
}
