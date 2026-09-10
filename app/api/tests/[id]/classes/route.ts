export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await db
    .from("test_classes")
    .select("class_id, classes!inner(id, name)")
    .eq("test_id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map((r: any) => ({ id: r.classes.id, name: r.classes.name })));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await db.from("test_classes").delete().eq("test_id", params.id).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: data?.length ?? 0 });
}
