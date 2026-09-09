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

  const { data, error } = await db
    .from("results")
    .update({ status: "released", released_at: new Date().toISOString(), released_by: user.id })
    .in("attempt_id", attempt_ids)
    .eq("status", "graded")
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ released: data.length });
}
