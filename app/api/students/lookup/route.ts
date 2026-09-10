export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Public. Verification step after an exam code is entered: student picks their
// class from a dropdown (scoped to the exam) and gives their name + optional ID.
// Creates the student record on first access, reuses it on repeat access.
export async function POST(req: NextRequest) {
  const { class_id, student_name, student_code } = await req.json();
  if (!class_id || !student_name) {
    return NextResponse.json({ error: "Class and name are required" }, { status: 400 });
  }

  const { data: existing } = await db
    .from("students")
    .select("*")
    .eq("class_id", class_id)
    .ilike("name", student_name.trim())
    .maybeSingle();

  if (existing) return NextResponse.json({ student: existing });

  const { data: created, error } = await db
    .from("students")
    .insert({ class_id, name: student_name, student_code: student_code || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ student: created });
}
