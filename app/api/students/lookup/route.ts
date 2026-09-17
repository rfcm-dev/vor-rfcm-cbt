export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

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

  return NextResponse.json({ error: "Student not found. Please register first." }, { status: 404 });
}

// Admin: search students (optionally filtered by class and query)
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classId = req.nextUrl.searchParams.get("class_id");
  const q = req.nextUrl.searchParams.get("q");

  let query = db.from("students").select("id, name, class_id, teacher_name, photo_url");
  if (classId) query = query.eq("class_id", classId);
  if (q) query = query.ilike("name", `%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const classIds = Array.from(new Set((data ?? []).map((s: any) => s.class_id).filter(Boolean)));
  const { data: classes } = classIds.length > 0
    ? await db.from("classes").select("id, name, class_code").in("id", classIds)
    : { data: [] as any[] };
  const classMap = Object.fromEntries((classes ?? []).map((c: any) => [c.id, c]));

  const enriched = (data ?? []).map((s: any) => ({
    ...s,
    class_name: classMap[s.class_id]?.name ?? "",
    class_code: classMap[s.class_id]?.class_code ?? null,
  }));

  return NextResponse.json(enriched);
}

// Admin: update student
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { student_id, teacher_name } = await req.json();
  if (!student_id) return NextResponse.json({ error: "student_id is required" }, { status: 400 });

  const updateData: any = {};
  if (teacher_name !== undefined) updateData.teacher_name = teacher_name;

  const { data, error } = await db
    .from("students")
    .update(updateData)
    .eq("id", student_id)
    .select("id, name, class_id, teacher_name, photo_url")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  return NextResponse.json(data);
}

// Admin: delete student(s)
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const studentId = body.student_id;
  const studentIds = body.student_ids;

  if (!studentId && !studentIds) {
    return NextResponse.json({ error: "student_id or student_ids is required" }, { status: 400 });
  }

  const ids = studentIds ? (Array.isArray(studentIds) ? studentIds : [studentIds]) : [studentId];
  const { error } = await db.from("students").delete().in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: ids.length });
}
