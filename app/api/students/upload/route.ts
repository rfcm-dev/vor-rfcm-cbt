export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const classId = formData.get("class_id") as string | null;
  const file = formData.get("file") as File | null;

  if (!classId || !file) {
    return NextResponse.json({ error: "class_id and file are required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let rows: any[];
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  } catch {
    return NextResponse.json({ error: "Could not read that file — make sure it's a .xlsx" }, { status: 400 });
  }

  const { data: existingStudents } = await db.from("students").select("name, class_id").eq("class_id", classId);
  const existingNames = new Set((existingStudents ?? []).map((s: any) => s.name.toLowerCase().trim()));
  const seenNames = new Set<string>();
  const errors: string[] = [];
  const toInsert: any[] = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const name = String(row["Student Name"] ?? "").trim();

    if (!name) { errors.push(`Row ${rowNum}: Student Name is required`); return; }
    if (seenNames.has(name.toLowerCase())) { errors.push(`Row ${rowNum}: Duplicate name "${name}" within the file`); return; }
    if (existingNames.has(name.toLowerCase())) { errors.push(`Row ${rowNum}: Student "${name}" already exists in this class`); return; }

    seenNames.add(name.toLowerCase());
    toInsert.push({ class_id: classId, name, student_code: row["Student Code (optional)"] ? String(row["Student Code (optional)"]).trim() : null });
  });

  if (errors.length > 0) {
    return NextResponse.json({ error: "Some rows could not be imported", details: errors }, { status: 400 });
  }
  if (toInsert.length === 0) {
    return NextResponse.json({ error: "No valid student rows found in the file" }, { status: 400 });
  }

  const { data, error } = await db.from("students").insert(toInsert).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inserted: data.length });
}
