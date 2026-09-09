import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await db
    .from("tests")
    .select("*, questions(count)")
    .eq("id", params.id)
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });

  const questionCount = (data as any).questions?.count ?? 0;
  const { count } = await db.from("questions").select("*", { count: "exact", head: true }).eq("test_id", params.id);

  return NextResponse.json({ ...data, question_count: count ?? questionCount });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, time_limit_minutes, opens_at, closes_at, class_ids } = await req.json();

  const updateData: any = {};
  if (title) updateData.title = title;
  if (time_limit_minutes) updateData.time_limit_minutes = time_limit_minutes;
  if (opens_at !== undefined) updateData.opens_at = opens_at || null;
  if (closes_at !== undefined) updateData.closes_at = closes_at || null;

  let data: any = null;
  if (Object.keys(updateData).length > 0) {
    const result = await db.from("tests").update(updateData).eq("id", params.id).select().single();
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    data = result.data;
  } else {
    const existing = await db.from("tests").select("*").eq("id", params.id).single();
    if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 });
    data = existing.data;
  }

  if (Array.isArray(class_ids)) {
    const { error: delError } = await db.from("test_classes").delete().eq("test_id", params.id).select();
    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }
    if (class_ids.length > 0) {
      const rows = class_ids.map((cid: string) => ({ test_id: params.id, class_id: cid }));
      const { data: inserted, error: tcError } = await db.from("test_classes").insert(rows).select();
      if (tcError) {
        return NextResponse.json({ error: tcError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: attempts } = await db
    .from("attempts")
    .select("id")
    .eq("test_id", params.id)
    .limit(1);

  if (attempts && attempts.length > 0) {
    return NextResponse.json({ error: "This exam has student attempts and cannot be deleted — unpublish it instead." }, { status: 409 });
  }

  const { error: tcDelError } = await db.from("test_classes").delete().eq("test_id", params.id);
  if (tcDelError) return NextResponse.json({ error: tcDelError.message }, { status: 500 });
  const { error: qDelError } = await db.from("questions").delete().eq("test_id", params.id);
  if (qDelError) return NextResponse.json({ error: qDelError.message }, { status: 500 });
  const { error } = await db.from("tests").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
