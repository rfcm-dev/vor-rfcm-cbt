export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await db
    .from("tests")
    .select("sections")
    .eq("id", params.id)
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });
  return NextResponse.json(data.sections ?? []);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, time_limit_minutes, question_ids, section_id } = await req.json();
  if (!title || !time_limit_minutes) {
    return NextResponse.json({ error: "title and time_limit_minutes are required" }, { status: 400 });
  }

  const { data: existing } = await db.from("tests").select("sections").eq("id", params.id).single();
  if (!existing) return NextResponse.json({ error: "Test not found" }, { status: 404 });

  let sections = existing.sections ?? [];

  if (section_id) {
    sections = sections.map((s: any) => s.id === section_id ? { ...s, title, time_limit_minutes, question_ids: Array.isArray(question_ids) ? question_ids : s.question_ids } : s);
  } else {
    sections = [...sections, { id: crypto.randomUUID(), title, time_limit_minutes, question_ids: Array.isArray(question_ids) ? question_ids : [] }];
  }

  const { error } = await db.from("tests").update({ sections }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const updated = sections.find((s: any) => !section_id ? s.id === sections[sections.length - 1].id : s.id === section_id);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sectionId = req.nextUrl.searchParams.get("section_id");
  if (!sectionId) return NextResponse.json({ error: "section_id is required" }, { status: 400 });

  const { data: existing } = await db.from("tests").select("sections").eq("id", params.id).single();
  if (!existing) return NextResponse.json({ error: "Test not found" }, { status: 404 });

  const sections = (existing.sections ?? []).filter((s: any) => s.id !== sectionId);
  const { error } = await db.from("tests").update({ sections }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
