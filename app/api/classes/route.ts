import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

// GET: list classes. POST: create a class (admin/teacher/superadmin).
export async function GET() {
  const { data, error } = await db.from("classes").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, class_code } = await req.json();
  if (!name) return NextResponse.json({ error: "Class name is required" }, { status: 400 });

  const { data, error } = await db
    .from("classes")
    .insert({ name, class_code: class_code || null, created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
