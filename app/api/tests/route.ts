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
  let query = db.from("tests").select("*").order("created_at", { ascending: false });
  if (classId) query = query.eq("class_id", classId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: tcRows } = await db.from("test_classes").select("test_id");
  const countMap: Record<string, number> = {};
  (tcRows ?? []).forEach((r: any) => { countMap[r.test_id] = (countMap[r.test_id] || 0) + 1; });

  const { data: attempts } = await db
    .from("attempts")
    .select("id, test_id, status")
    .in("test_id", (data ?? []).map((t: any) => t.id));

  const { data: results } = await db
    .from("results")
    .select("attempt_id, status")
    .in("attempt_id", (attempts ?? []).map((a: any) => a.id));

  const resultStatusMap = Object.fromEntries((results ?? []).map((r: any) => [r.attempt_id, r.status]));

  const enriched = (data ?? []).map((t: any) => {
    const testAttempts = (attempts ?? []).filter((a: any) => a.test_id === t.id);
    const submitted = testAttempts.filter((a: any) => a.status === "submitted" || a.status === "auto_submitted").length;
    const pendingGrading = testAttempts.filter((a: any) => {
      const rStatus = resultStatusMap[a.id];
      return rStatus === "pending_grading";
    }).length;
    const readyToRelease = testAttempts.filter((a: any) => {
      const rStatus = resultStatusMap[a.id];
      return rStatus === "graded";
    }).length;
    return {
      ...t,
      class_count: countMap[t.id] || 0,
      submitted_count: submitted,
      pending_grading_count: pendingGrading,
      ready_to_release_count: readyToRelease,
    };
  });
  return NextResponse.json(enriched);
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
