import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { class_name, class_code } = await req.json();
  if (!class_name || !class_name.trim()) {
    return NextResponse.json({ error: "Class name is required" }, { status: 400 });
  }

  let classQuery = db.from("classes").select("id, name, class_code").eq("name", class_name.trim());
  if (class_code?.trim()) {
    classQuery = classQuery.eq("class_code", class_code.trim());
  }

  const { data: classRow, error: classError } = await classQuery.maybeSingle();
  if (classError || !classRow) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const { data: tcRows, error: tcError } = await db
    .from("test_classes")
    .select("test_id")
    .eq("class_id", classRow.id);

  if (tcError) return NextResponse.json({ error: tcError.message }, { status: 500 });

  const testIds = (tcRows ?? []).map((r: any) => r.test_id);
  if (testIds.length === 0) {
    return NextResponse.json({ error: "No examination is currently available for this class" }, { status: 404 });
  }

  const { data: tests, error: testsError } = await db
    .from("tests")
    .select("*")
    .in("id", testIds)
    .eq("status", "active");

  if (testsError) return NextResponse.json({ error: testsError.message }, { status: 500 });

  const now = new Date();
  const openTests = (tests ?? []).filter((t: any) => {
    if (t.opens_at && new Date(t.opens_at) > now) return false;
    if (t.closes_at && new Date(t.closes_at) < now) return false;
    return true;
  });

  if (openTests.length === 0) {
    return NextResponse.json({ error: "No examination is currently available for this class" }, { status: 404 });
  }

  if (openTests.length > 1) {
    return NextResponse.json({ error: "More than one examination is open for this class — contact your admin" }, { status: 409 });
  }

  const test = openTests[0];

  const { count } = await db.from("questions").select("*", { count: "exact", head: true }).eq("test_id", test.id);

  return NextResponse.json({ test, class: classRow, question_count: count ?? 0 });
}
