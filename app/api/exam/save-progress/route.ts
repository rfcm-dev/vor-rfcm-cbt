export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Public. Called periodically (and on reconnect) from the exam-taking screen to
// persist in-progress answers server-side, independent of the final submit.
export async function PATCH(req: NextRequest) {
  const { attempt_id, draft_answers } = await req.json();
  if (!attempt_id || typeof draft_answers !== "object") {
    return NextResponse.json({ error: "attempt_id and draft_answers are required" }, { status: 400 });
  }

  const { error } = await db
    .from("attempts")
    .update({ draft_answers })
    .eq("id", attempt_id)
    .eq("status", "in_progress");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, saved_at: new Date().toISOString() });
}
