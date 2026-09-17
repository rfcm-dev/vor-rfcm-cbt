export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const name = String(formData.get("name") || "").trim().toUpperCase();
    const classId = String(formData.get("class_id") || "").trim();
    const classCode = String(formData.get("class_code") || "").trim();
    const teacherName = String(formData.get("teacher_name") || "").trim();
    const file = formData.get("photo") as File | null;

    if (!name || !classId) {
      return NextResponse.json({ error: "Name and class are required" }, { status: 400 });
    }

    const { data: classRow } = await db.from("classes").select("id, class_code").eq("id", classId).maybeSingle();
    if (!classRow) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    if (classCode && classRow.class_code && classRow.class_code.toLowerCase() !== classCode.toLowerCase()) {
      return NextResponse.json({ error: "Invalid class code" }, { status: 403 });
    }

    const { data: existing } = await db
      .from("students")
      .select("id")
      .eq("class_id", classId)
      .ilike("name", name)
      .maybeSingle();

    let photoUrl: string | null = null;
    if (file && file.size > 0) {
      const supabase = getSupabase();
      if (!supabase) {
        return NextResponse.json({ error: "Storage is not configured" }, { status: 500 });
      }

      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${classId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("RFCM CBT")
        .upload(fileName, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      const { data: publicData } = supabase.storage.from("RFCM CBT").getPublicUrl(fileName);
      photoUrl = publicData.publicUrl;
    }

    if (existing) {
      const { error: updateError } = await db
        .from("students")
        .update({
          teacher_name: teacherName || null,
          photo_url: photoUrl ?? undefined,
        })
        .eq("id", existing.id);

      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
      return NextResponse.json({ student_id: existing.id, updated: true });
    }

    const { data: student, error: insertError } = await db
      .from("students")
      .insert({
        class_id: classId,
        name,
        teacher_name: teacherName || null,
        photo_url: photoUrl,
      })
      .select("id")
      .single();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    return NextResponse.json({ student_id: student.id, updated: false });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Registration failed" }, { status: 500 });
  }
}
