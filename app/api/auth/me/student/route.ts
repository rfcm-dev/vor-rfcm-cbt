export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, STUDENT_SESSION_COOKIE_NAME } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(STUDENT_SESSION_COOKIE_NAME)?.value;
  const user = token ? await verifySessionToken(token) : null;
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ student: user });
}
