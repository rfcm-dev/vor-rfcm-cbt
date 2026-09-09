import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

const VALID_TYPES = ["mcq", "true_false", "fill_blank", "essay"];

const TYPE_ALIASES: Record<string, string> = {
  mcq: "mcq",
  "multiple_choice": "mcq",
  "multiple choice": "mcq",
  "multi choice": "mcq",
  mc: "mcq",
  true_false: "true_false",
  "true/false": "true_false",
  "true false": "true_false",
  "t f": "true_false",
  tf: "true_false",
  "t/f": "true_false",
  fill_blank: "fill_blank",
  "fill in the blank": "fill_blank",
  "fill-in-the-blank": "fill_blank",
  "short answer": "fill_blank",
  "fill blank": "fill_blank",
  essay: "essay",
  "long answer": "essay",
  long_answer: "essay",
};

function normalizeType(raw: string): string | null {
  const key = raw.toLowerCase().replace(/[\s_/-]+/g, " ").trim();
  return TYPE_ALIASES[key] ?? null;
}

function normalizeBoolean(raw: string): string | null {
  const v = raw.toLowerCase().trim();
  if (["true", "t", "yes", "y", "a"].includes(v)) return "true";
  if (["false", "f", "no", "n", "b"].includes(v)) return "false";
  return null;
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const testId = formData.get("test_id") as string | null;
  const file = formData.get("file") as File | null;

  if (!testId || !file) {
    return NextResponse.json({ error: "test_id and file are required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let rows: any[];
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  } catch {
    return NextResponse.json({ error: "Could not read that file â€” make sure it's a .xlsx using the template" }, { status: 400 });
  }

  const errors: string[] = [];
  const toInsert: any[] = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const question = String(row["Question"] ?? "").trim();
    const rawType = String(row["Type"] ?? "").trim();
    const type = normalizeType(rawType);
    const points = Number(row["Points"] ?? 1) || 1;

    if (!question) { errors.push(`Row ${rowNum}: Question is empty`); return; }
    if (!type) {
      errors.push(`Row ${rowNum}: Type "${rawType}" is not recognised â€” accepted values: mcq (or multiple_choice), true_false (or true/false), fill_blank (or fill in the blank), essay (or long answer)`);
      return;
    }

    let options = null;
    let correct_answer: string | null = null;

    if (type === "mcq") {
      const opts = ["A", "B", "C", "D"]
        .map((letter) => ({ id: letter, text: String(row[`Option ${letter}`] ?? "").trim() }))
        .filter((o) => o.text);
      if (opts.length < 2) { errors.push(`Row ${rowNum}: mcq needs at least 2 options`); return; }
      const rawCorrect = String(row["Correct Answer"] ?? "").trim().toUpperCase();
      const normalizedCorrect = rawCorrect.length === 1 ? rawCorrect : rawCorrect;
      correct_answer = normalizedCorrect;
      if (!opts.some((o) => o.id === correct_answer)) {
        errors.push(`Row ${rowNum}: Correct Answer "${correct_answer}" doesn't match any option (A, B, C, D)`);
        return;
      }
      options = opts;
    } else if (type === "true_false") {
      const rawCorrect = String(row["Correct Answer"] ?? "").trim();
      const boolVal = normalizeBoolean(rawCorrect);
      if (!boolVal) {
        errors.push(`Row ${rowNum}: true_false Correct Answer must be "true" or "false" (got "${rawCorrect}")`);
        return;
      }
      correct_answer = boolVal;
    } else if (type === "fill_blank") {
      correct_answer = String(row["Correct Answer"] ?? "").trim();
      if (!correct_answer) { errors.push(`Row ${rowNum}: fill_blank needs a Correct Answer`); return; }
    }

    toInsert.push({ test_id: testId, type, content: question, options, correct_answer, points, order_index: i, created_by: user.id });
  });

  if (errors.length > 0) {
    return NextResponse.json({ error: "Some rows could not be parsed", details: errors }, { status: 400 });
  }
  if (toInsert.length === 0) {
    return NextResponse.json({ error: "No valid question rows found in the file" }, { status: 400 });
  }

  const { data, error } = await db.from("questions").insert(toInsert).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inserted: data.length });
}

