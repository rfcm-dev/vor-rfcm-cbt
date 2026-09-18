export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/student-session";

export async function GET() {
  const student = await getStudentSession();
  if (!student) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: studentRow } = await db
    .from("students")
    .select("id, name, class_id, teacher_name, photo_url")
    .eq("id", student.id)
    .single();

  if (!studentRow) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const classId = studentRow.class_id;
  let class_name = "";
  let class_code: string | null = null;
  if (classId) {
    const { data: classRow } = await db.from("classes").select("name, class_code").eq("id", classId).maybeSingle();
    class_name = classRow?.name ?? "";
    class_code = classRow?.class_code ?? null;
  }

  return NextResponse.json({
    id: studentRow.id,
    name: studentRow.name,
    class_id: classId,
    class_name,
    class_code,
    teacher_name: studentRow.teacher_name,
    photo_url: studentRow.photo_url,
  });
}

export async function PATCH(req: NextRequest) {
  const student = await getStudentSession();
  if (!student) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { teacher_name } = await req.json();

  const { data, error } = await db
    .from("students")
    .update({ teacher_name: teacher_name ?? null })
    .eq("id", student.id)
    .select("id, name, class_id, teacher_name, photo_url")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  let class_name = "";
  let class_code: string | null = null;
  if (data.class_id) {
    const { data: classRow } = await db.from("classes").select("name, class_code").eq("id", data.class_id).maybeSingle();
    class_name = classRow?.name ?? "";
    class_code = classRow?.class_code ?? null;
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    class_id: data.class_id,
    class_name,
    class_code,
    teacher_name: data.teacher_name,
    photo_url: data.photo_url,
  });
}
