export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, stack, url, userAgent, timestamp } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const { error } = await db
      .from("client_errors")
      .insert({
        message,
        stack: typeof stack === "string" ? stack : null,
        url: typeof url === "string" ? url : null,
        user_agent: typeof userAgent === "string" ? userAgent : null,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
