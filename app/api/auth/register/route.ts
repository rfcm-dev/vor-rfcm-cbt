export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { name, password, role } = await req.json();

  if (!name || !password) {
    return NextResponse.json({ error: "Name and password are required" }, { status: 400 });
  }

  const allowedRoles = ["teacher", "executive"];
  const selectedRole = allowedRoles.includes(role) ? role : "teacher";

  const trimmedName = name.trim().toUpperCase();
  const existing = await db.from("users").select("id").ilike("name", trimmedName).maybeSingle();
  if (existing.data) {
    return NextResponse.json({ error: "A user with this name already exists" }, { status: 409 });
  }

  const password_hash = await hashPassword(password);
  const { data, error } = await db
    .from("users")
    .insert({ name: trimmedName, password_hash, role: selectedRole })
    .select("id, name, role, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
