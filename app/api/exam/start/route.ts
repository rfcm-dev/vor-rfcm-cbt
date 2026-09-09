import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { test_id, student_id } = await req.json();
  if (!test_id || !student_id) {
    return NextResponse.json({ error: "test_id and student_id are required" }, { status: 400 });
  }

  const { data: test, error: testError } = await db
    .from("tests")
    .select("*")
    .eq("id", test_id)
    .single();
  if (testError || !test || test.status !== "active") {
    return NextResponse.json({ error: "This examination is not currently open" }, { status: 403 });
  }

  const { data: existing } = await db
    .from("attempts")
    .select("*")
    .eq("test_id", test.id)
    .eq("student_id", student_id)
    .maybeSingle();

  if (existing) {
    if (existing.status !== "in_progress") {
      return NextResponse.json({ error: "You have already submitted this examination" }, { status: 409 });
    }
    return NextResponse.json({ attempt: existing, test, resumed: true });
  }

  const { data: attempt, error } = await db
    .from("attempts")
    .insert({ test_id: test.id, student_id, status: "in_progress" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ attempt, test, resumed: false });
}
