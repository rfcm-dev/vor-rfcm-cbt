export const dynamic = 'force-dynamic';

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
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    if (existing.status !== "in_progress") {
      const { data: retakeApproval } = await db
        .from("retake_approvals")
        .select("*")
        .eq("test_id", test.id)
        .eq("student_id", student_id)
        .is("consumed_at", null)
        .limit(1)
        .maybeSingle();

      if (!retakeApproval) {
        return NextResponse.json({ error: "You have already submitted this examination" }, { status: 409 });
      }

      await db
        .from("retake_approvals")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", retakeApproval.id);

      const { data: attempt, error } = await db
        .from("attempts")
        .insert({ test_id: test.id, student_id, status: "in_progress" })
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ attempt, test, resumed: false });
    }

    const { data: retakeApproval } = await db
      .from("retake_approvals")
      .select("*")
      .eq("test_id", test.id)
      .eq("student_id", student_id)
      .is("consumed_at", null)
      .maybeSingle();

    if (retakeApproval) {
      await db
        .from("retake_approvals")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", retakeApproval.id);

      const { data: attempt, error } = await db
        .from("attempts")
        .insert({ test_id: test.id, student_id, status: "in_progress" })
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ attempt, test, resumed: false });
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
