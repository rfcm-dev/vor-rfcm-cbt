export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

function generateExamCode(title: string) {
  const slug = title.trim().slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const year = new Date().getFullYear();
  const rand = Math.floor(100 + Math.random() * 900);
  return `RFCM-${slug || "EXAM"}-${year}-${rand}`;
}

export async function GET(req: NextRequest) {
  const classId = req.nextUrl.searchParams.get("class_id");
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "20", 10)));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let testsQuery = db.from("tests").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
  if (classId) testsQuery = testsQuery.eq("class_id", classId);

  const { data: tests, count, error } = await testsQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const testIds = (tests ?? []).map((t: any) => t.id);
  if (testIds.length === 0) {
    return NextResponse.json({ data: [], count: 0, page, limit });
  }

  const [
    { data: tcRows },
    { data: attempts },
    { data: results },
  ] = await Promise.all([
    db.from("test_classes").select("test_id").in("test_id", testIds),
    db.from("attempts").select("id, test_id, status").in("test_id", testIds),
    db.from("results").select("attempt_id, status").in("attempt_id", (await db.from("attempts").select("id").in("test_id", testIds)).data?.map((a: any) => a.id) ?? []),
  ]);

  const countMap: Record<string, number> = {};
  (tcRows ?? []).forEach((r: any) => { countMap[r.test_id] = (countMap[r.test_id] || 0) + 1; });

  const resultStatusMap = Object.fromEntries((results ?? []).map((r: any) => [r.attempt_id, r.status]));
  const submittedByTest: Record<string, number> = {};
  const pendingByTest: Record<string, number> = {};
  const readyByTest: Record<string, number> = {};
  (attempts ?? []).forEach((a: any) => {
    const rStatus = resultStatusMap[a.id];
    if (a.status === "submitted" || a.status === "auto_submitted") {
      submittedByTest[a.test_id] = (submittedByTest[a.test_id] || 0) + 1;
    }
    if (rStatus === "pending_grading") pendingByTest[a.test_id] = (pendingByTest[a.test_id] || 0) + 1;
    if (rStatus === "graded") readyByTest[a.test_id] = (readyByTest[a.test_id] || 0) + 1;
  });

  const enriched = (tests ?? []).map((t: any) => ({
    ...t,
    class_count: countMap[t.id] || 0,
    submitted_count: submittedByTest[t.id] || 0,
    pending_grading_count: pendingByTest[t.id] || 0,
    ready_to_release_count: readyByTest[t.id] || 0,
  }));

  return NextResponse.json({ data: enriched, count: count ?? 0, page, limit });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, class_ids, time_limit_minutes, exam_code, opens_at, closes_at } = await req.json();
  if (!title || !class_ids || !Array.isArray(class_ids) || class_ids.length === 0 || !time_limit_minutes) {
    return NextResponse.json({ error: "title, class_ids (at least one), and time_limit_minutes are required" }, { status: 400 });
  }

  const code = exam_code?.trim() || generateExamCode(title);

  const { data, error } = await db
    .from("tests")
    .insert({
      title,
      class_id: class_ids[0],
      created_by: user.id,
      time_limit_minutes,
      exam_code: code,
      opens_at: opens_at || null,
      closes_at: closes_at || null,
      status: "draft",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = class_ids.map((cid: string) => ({ test_id: data.id, class_id: cid }));
  const { error: tcError } = await db.from("test_classes").insert(rows);
  if (tcError) return NextResponse.json({ error: tcError.message }, { status: 500 });

  return NextResponse.json(data);
}
