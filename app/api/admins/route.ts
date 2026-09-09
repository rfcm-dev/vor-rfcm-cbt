import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { hashPassword } from "@/lib/auth";

// Superadmin only: list and create admins/teachers.
export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "superadmin") {
    return NextResponse.json({ error: "Superadmin only" }, { status: 403 });
  }

  const { data, error } = await db.from("users").select("id, name, role, created_at").order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "superadmin") {
    return NextResponse.json({ error: "Superadmin only" }, { status: 403 });
  }

  const { name, password, role } = await req.json();
  if (!name || !password || !["admin", "teacher"].includes(role)) {
    return NextResponse.json({ error: "name, password, and a valid role are required" }, { status: 400 });
  }

  const password_hash = await hashPassword(password);
  const { data, error } = await db
    .from("users")
    .insert({ name, password_hash, role })
    .select("id, name, role, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
