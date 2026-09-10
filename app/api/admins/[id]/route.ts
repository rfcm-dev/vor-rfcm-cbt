export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { hashPassword } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user || user.role !== "superadmin") {
    return NextResponse.json({ error: "Superadmin only" }, { status: 403 });
  }

  const { role, password } = await req.json();

  const updateData: any = {};
  if (role && ["superadmin", "admin", "executive", "teacher"].includes(role)) {
    updateData.role = role;
  }
  if (password) {
    updateData.password_hash = await hashPassword(password);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await db
    .from("users")
    .update(updateData)
    .eq("id", params.id)
    .select("id, name, role, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user || user.role !== "superadmin") {
    return NextResponse.json({ error: "Superadmin only" }, { status: 403 });
  }

  const { error } = await db.from("users").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
