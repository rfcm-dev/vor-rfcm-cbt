export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createStudentSessionToken, STUDENT_SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { name, password } = await req.json();

  if (!name || !password) {
    return NextResponse.json({ error: "Name and password are required" }, { status: 400 });
  }

  const trimmedName = name.trim();
  const { data: student, error } = await db
    .from("students")
    .select("id, name, password_hash")
    .ilike("name", trimmedName)
    .single();

  if (error || !student) {
    return NextResponse.json({ error: "Invalid name or password" }, { status: 401 });
  }

  if (!student.password_hash) {
    return NextResponse.json({ error: "No password set. Please register first." }, { status: 401 });
  }

  const valid = await verifyPassword(password, student.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid name or password" }, { status: 401 });
  }

  const token = await createStudentSessionToken({ id: student.id, name: student.name, role: "student" });

  const res = NextResponse.json({ ok: true, student: { id: student.id, name: student.name } });
  res.cookies.set(STUDENT_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
