export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

// Releases one or more results so students can see them on the public check-results page.
// Only "graded" results (all essays scored) can be released.
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { attempt_ids } = await req.json();
  if (!Array.isArray(attempt_ids) || attempt_ids.length === 0) {
    return NextResponse.json({ error: "attempt_ids is required" }, { status: 400 });
  }

  const { data: matchedBefore, error: matchError } = await db
    .from("results")
    .select("attempt_id, status")
    .in("attempt_id", attempt_ids);

  if (matchError) {
    return NextResponse.json({ error: matchError.message }, { status: 500 });
  }

  const gradedIds = (matchedBefore ?? []).filter((r: any) => r.status === "graded").map((r: any) => r.attempt_id);
  const alreadyReleased = (matchedBefore ?? []).filter((r: any) => r.status === "released").map((r: any) => r.attempt_id);
  const otherStatuses = (matchedBefore ?? []).filter((r: any) => r.status !== "graded" && r.status !== "released").map((r: any) => ({ attempt_id: r.attempt_id, status: r.status }));

  if (gradedIds.length === 0) {
    return NextResponse.json({
      released: 0,
      debug: {
        total_matched: matchedBefore?.length ?? 0,
        already_released: alreadyReleased,
        other_statuses: otherStatuses,
        attempted_ids: attempt_ids,
      },
    });
  }

  const { data, error } = await db
    .from("results")
    .update({ status: "released", released_at: new Date().toISOString(), released_by: user.id })
    .in("attempt_id", gradedIds)
    .eq("status", "graded")
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ released: data.length, debug: { graded_ids: gradedIds, updated: data?.map((r: any) => r.attempt_id) ?? [] } });
}
