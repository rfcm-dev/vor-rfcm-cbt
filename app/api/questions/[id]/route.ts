export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, options, correct_answer, points } = await req.json();

  const { data: existing } = await db.from("questions").select("type").eq("id", params.id).single();
  if (!existing) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const updateData: any = {};
  if (content !== undefined) updateData.content = content;
  if (options !== undefined) updateData.options = options;
  if (correct_answer !== undefined) updateData.correct_answer = existing.type === "essay" ? null : correct_answer;
  if (points !== undefined) updateData.points = points;

  const { data, error } = await db
    .from("questions")
    .update(updateData)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: answers } = await db
    .from("answers")
    .select("id")
    .eq("question_id", params.id)
    .limit(1);

  if (answers && answers.length > 0) {
    return NextResponse.json({ error: "This question has student answers and cannot be deleted." }, { status: 409 });
  }

  const { error } = await db.from("questions").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
