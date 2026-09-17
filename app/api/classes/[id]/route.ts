export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, class_code } = await req.json();
  if (!name) return NextResponse.json({ error: "Class name is required" }, { status: 400 });

  const { data, error } = await db
    .from("classes")
    .update({ name, class_code: class_code || null })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error: tcError } = await db.from("test_classes").delete().eq("class_id", params.id);
  if (tcError) return NextResponse.json({ error: tcError.message }, { status: 500 });

  const { error: caError } = await db.from("class_assignments").delete().eq("class_id", params.id);
  if (caError) return NextResponse.json({ error: caError.message }, { status: 500 });

  const { error: studentError } = await db.from("students").delete().eq("class_id", params.id);
  if (studentError) return NextResponse.json({ error: studentError.message }, { status: 500 });

  const { error } = await db.from("classes").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
