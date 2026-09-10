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
    .select("id, type, content, points, created_by, test_id")
    .order("id", { ascending: false })
    .limit(100);

  if (mineOnly) {
    query = query.eq("created_by", user.id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const testIds = Array.from(new Set((data ?? []).map((q: any) => q.test_id).filter(Boolean)));
  const userIds = Array.from(new Set((data ?? []).map((q: any) => q.created_by).filter(Boolean)));
  const [testsRes, usersRes] = await Promise.all([
    testIds.length > 0 ? db.from("tests").select("id, title").in("id", testIds) : { data: [] as any[] },
    userIds.length > 0 ? db.from("users").select("id, name").in("id", userIds) : { data: [] as any[] },
  ]);
  const testMap = Object.fromEntries((testsRes.data ?? []).map((t: any) => [t.id, t]));
  const userMap = Object.fromEntries((usersRes.data ?? []).map((u: any) => [u.id, u]));

  const enriched = (data ?? []).map((q: any) => ({
    ...q,
    tests: testMap[q.test_id] ? { title: testMap[q.test_id].title } : null,
    users: userMap[q.created_by] ? { name: userMap[q.created_by].name } : null,
  }));

  return NextResponse.json(enriched);
}
