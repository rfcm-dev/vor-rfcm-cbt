export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const headers = ["Name", "Class", "Class Code (optional)", "Teacher Name (optional)"];
  const example = [
    ["Lawal Feranmi Abel", "GENESIS 3", "", "Pastor John"],
    ["LAWAL OLAMIDE", "GENESIS 3", "", "Pastor Mary"],
    ["Test Student", "Class A", "ABC123", ""],
  ];

  const instructions = [
    ["INSTRUCTIONS — Student bulk upload"],
    [""],
    ["Name", "Required. Full name as the student should see it."],
    ["Class", "Required. Must match an existing class name exactly (case-insensitive)."],
    ["Class Code", "Optional. If your class uses a code, enter it here."],
    ["Teacher Name", "Optional. Name of the teacher or class supervisor."],
    [""],
    ["NOTE: Photos are not supported via bulk upload. Use the individual registration page to add photos."],
  ];

  const sheet1 = XLSX.utils.aoa_to_sheet([headers, ...example]);
  const sheet2 = XLSX.utils.aoa_to_sheet(instructions);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet1, "Students");
  XLSX.utils.book_append_sheet(workbook, sheet2, "Instructions");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="rfcm-cbt-students-template.xlsx"',
    },
  });
}
