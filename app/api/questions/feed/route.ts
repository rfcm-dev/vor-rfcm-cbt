export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mineOnly = req.nextUrl.searchParams.get("mine") === "1";

  let query = db
    .from("questions")
    .select("id, type, content, points, created_by, tests(title), users(name)")
    .order("id", { ascending: false })
    .limit(100);

  if (mineOnly) {
    query = query.eq("created_by", user.id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
