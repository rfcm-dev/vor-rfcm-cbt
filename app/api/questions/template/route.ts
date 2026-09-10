export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

// Downloadable Excel template for bulk question upload. Fixed columns only —
// this is the safe, structured path deliberately chosen over free-form
// Word/PDF parsing, which is fragile and high-risk to get wrong silently.
export async function GET() {
  const headers = ["Question", "Type", "Option A", "Option B", "Option C", "Option D", "Correct Answer", "Points"];
  const example = [
    ["What is reconciliation?", "mcq", "Making peace with God", "A type of fruit", "A church building", "A song title", "A", "1"],
    ["God desires mankind to be reconciled to Him.", "true_false", "", "", "", "", "true", "1"],
    ["Fill in: 2 Corinthians ___:17-19", "fill_blank", "", "", "", "", "5", "1"],
    ["Explain the importance of reconciliation according to 2 Corinthians 5:17-19.", "essay", "", "", "", "", "", "10"],
  ];

  const instructions = [
    ["INSTRUCTIONS — Accepted values for the Type column:"],
    ["mcq", "also accepted: multiple_choice, multiple choice, multi choice, mc"],
    ["true_false", "also accepted: true/false, true false, tf, t/f"],
    ["fill_blank", "also accepted: fill in the blank, fill-in-the-blank, short answer, fill blank"],
    ["essay", "also accepted: long answer, long_answer"],
    [""],
    ["Correct Answer rules:"],
    ["mcq", "enter the option letter: A, B, C, or D (case doesn't matter)"],
    ["true_false", "enter: true, t, yes, false, f, or no (case doesn't matter)"],
    ["fill_blank", "enter the exact expected text"],
    ["essay", "leave blank — no correct answer required"],
  ];

  const sheet1 = XLSX.utils.aoa_to_sheet([headers, ...example]);
  const sheet2 = XLSX.utils.aoa_to_sheet(instructions);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet1, "Questions");
  XLSX.utils.book_append_sheet(workbook, sheet2, "Instructions");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="rfcm-cbt-question-template.xlsx"',
    },
  });
}
