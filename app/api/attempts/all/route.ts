export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { getAttemptOverview } from "@/lib/attempt-overview";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const testId = req.nextUrl.searchParams.get("test_id");
  const classId = req.nextUrl.searchParams.get("class_id");
  const resultStatus = req.nextUrl.searchParams.get("status");

  const attempts = await getAttemptOverview({
    testId: testId ?? undefined,
    classId: classId ?? undefined,
    resultStatus: resultStatus ?? undefined,
  });

  return NextResponse.json(attempts);
}
