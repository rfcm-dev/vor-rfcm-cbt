export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { student_id, current_password, new_password } = await req.json();

    if (!student_id || !current_password || !new_password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (new_password.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
    }

    const { data: student, error } = await db
      .from("students")
      .select("id, password_hash")
      .eq("id", student_id)
      .single();

    if (error || !student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (!student.password_hash) {
      return NextResponse.json({ error: "No password set. Please register first." }, { status: 400 });
    }

    const valid = await verifyPassword(current_password, student.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    const newHash = await hashPassword(new_password);

    const { error: updateError } = await db
      .from("students")
      .update({ password_hash: newHash })
      .eq("id", student_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to change password" }, { status: 500 });
  }
}
