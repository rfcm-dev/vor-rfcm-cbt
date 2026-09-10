export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const headers = ["Class Name", "Class Code (optional)"];
  const example = [
    ["Juniors", "JUN"],
    ["Seniors", "SEN"],
    ["Adults", ""],
  ];

  const sheet = XLSX.utils.aoa_to_sheet([headers, ...example]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Classes");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="rfcm-cbt-classes-template.xlsx"',
    },
  });
}
