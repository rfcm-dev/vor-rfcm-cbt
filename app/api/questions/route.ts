import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

// GET: list questions for a test. POST: add a question (builder path).
// File-upload parsing (Excel/Word template) is a separate route to add later —
// it should end up calling the same insert shape as this POST.
export async function GET(req: NextRequest) {
  const testId = req.nextUrl.searchParams.get("test_id");
  if (!testId) return NextResponse.json({ error: "test_id is required" }, { status: 400 });

  const user = await getSessionUser();
  const mineOnly = req.nextUrl.searchParams.get("mine") === "1";

  let query = db
    .from("questions")
    .select("*")
    .eq("test_id", testId)
    .order("order_index", { ascending: true });

  if (mineOnly && user) {
    query = query.eq("created_by", user.id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { test_id, type, content, options, correct_answer, points, order_index } = await req.json();
  if (!test_id || !type || !content) {
    return NextResponse.json({ error: "test_id, type, and content are required" }, { status: 400 });
  }

  const { data, error } = await db
    .from("questions")
    .insert({
      test_id,
      type,
      content,
      options: options ?? null,
      correct_answer: type === "essay" ? null : correct_answer,
      points: points ?? 1,
      order_index: order_index ?? 0,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
