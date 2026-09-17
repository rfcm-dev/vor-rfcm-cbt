export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { test_id, student_id } = await req.json();
  if (!test_id || !student_id) {
    return NextResponse.json({ error: "test_id and student_id are required" }, { status: 400 });
  }

  const { data: existingApproval } = await db
    .from("retake_approvals")
    .select("id")
    .eq("test_id", test_id)
    .eq("student_id", student_id)
    .is("consumed_at", null)
    .maybeSingle();

  if (existingApproval) {
    return NextResponse.json({ error: "A retake is already approved for this student for this exam" }, { status: 409 });
  }

  const { data: test } = await db.from("tests").select("status").eq("id", test_id).single();
  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  const { data: student } = await db.from("students").select("id").eq("id", student_id).single();
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const { error } = await db.from("retake_approvals").insert({
    test_id,
    student_id,
    approved_by: user.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
