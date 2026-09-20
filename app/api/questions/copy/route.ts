export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { question_ids, target_test_id } = await req.json();
  if (!Array.isArray(question_ids) || question_ids.length === 0) {
    return NextResponse.json({ error: "question_ids is required" }, { status: 400 });
  }
  if (!target_test_id) {
    return NextResponse.json({ error: "target_test_id is required" }, { status: 400 });
  }

  const { data: sourceQuestions, error: fetchError } = await db
    .from("questions")
    .select("*")
    .in("id", question_ids);

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!sourceQuestions || sourceQuestions.length === 0) {
    return NextResponse.json({ error: "No questions found" }, { status: 404 });
  }

  const { data: maxOrderData, error: maxError } = await db
    .from("questions")
    .select("order_index")
    .eq("test_id", target_test_id)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const baseOrder = (maxOrderData as any)?.order_index ?? -1;

  const inserts = sourceQuestions.map((q: any, idx: number) => ({
    test_id: target_test_id,
    type: q.type,
    content: q.content,
    options: q.options,
    correct_answer: q.type === "essay" ? null : q.correct_answer,
    points: q.points,
    order_index: baseOrder + 1 + idx,
    created_by: user.id,
  }));

  const { data: inserted, error: insertError } = await db
    .from("questions")
    .insert(inserts)
    .select();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json(inserted);
}
