import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let rows: any[];
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  } catch {
    return NextResponse.json({ error: "Could not read that file — make sure it's a .xlsx using the template" }, { status: 400 });
  }

  const { data: existingClasses } = await db.from("classes").select("name");
  const existingNames = new Set((existingClasses ?? []).map((c: any) => c.name.toLowerCase()));
  const seenNames = new Set<string>();
  const errors: string[] = [];
  const toInsert: any[] = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const name = String(row["Class Name"] ?? "").trim();
    const classCode = String(row["Class Code (optional)"] ?? "").trim();

    if (!name) { errors.push(`Row ${rowNum}: Class Name is required`); return; }
    if (seenNames.has(name.toLowerCase())) { errors.push(`Row ${rowNum}: Duplicate class name "${name}" within the file`); return; }
    if (existingNames.has(name.toLowerCase())) { errors.push(`Row ${rowNum}: Class "${name}" already exists`); return; }

    seenNames.add(name.toLowerCase());
    toInsert.push({ name, class_code: classCode || null, created_by: user.id });
  });

  if (errors.length > 0) {
    return NextResponse.json({ error: "Some rows could not be imported", details: errors }, { status: 400 });
  }
  if (toInsert.length === 0) {
    return NextResponse.json({ error: "No valid class rows found in the file" }, { status: 400 });
  }

  const { data, error } = await db.from("classes").insert(toInsert).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inserted: data.length });
}
