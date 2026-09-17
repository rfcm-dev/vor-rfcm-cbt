export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { hashPassword } from "@/lib/auth";

// Superadmin and admin can list/create admins/teachers/executives.
// NOTE: 'executive' is intentionally provisional — treat it with teacher-level
// permissions for now (create/grade tests, no admin management) until its scope
// is defined more precisely.
export async function GET() {
  const user = await getSessionUser();
  if (!user || !["superadmin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Superadmin or admin only" }, { status: 403 });
  }

  const { data, error } = await db.from("users").select("id, name, role, created_at, permissions").order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const visible = user.role === "superadmin"
    ? data
    : (data ?? []).filter((u: any) => u.role !== "superadmin");

  return NextResponse.json(visible);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !["superadmin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Superadmin or admin only" }, { status: 403 });
  }

  const { name, password, role, permissions } = await req.json();
  if (!name || !password || !["admin", "executive", "teacher"].includes(role)) {
    return NextResponse.json({ error: "name, password, and a valid role are required" }, { status: 400 });
  }

  if (role === "admin" && user.role !== "superadmin") {
    return NextResponse.json({ error: "Only the superadmin can create additional admin accounts." }, { status: 403 });
  }

  const password_hash = await hashPassword(password);
  const { data, error } = await db
    .from("users")
    .insert({ name, password_hash, role, permissions: permissions ?? {} })
    .select("id, name, role, created_at, permissions")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
