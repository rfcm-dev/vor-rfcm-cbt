export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await db
    .from("test_classes")
    .select("class_id")
    .eq("test_id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const classIds = (data ?? []).map((r: any) => r.class_id).filter(Boolean);
  const { data: classes } = classIds.length > 0
    ? await db.from("classes").select("id, name").in("id", classIds)
    : { data: [] as any[] };
  const classMap = Object.fromEntries((classes ?? []).map((c: any) => [c.id, c]));

  return NextResponse.json((data ?? []).map((r: any) => ({ id: r.class_id, name: classMap[r.class_id]?.name ?? "" })));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await db.from("test_classes").delete().eq("test_id", params.id).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: data?.length ?? 0 });
}
