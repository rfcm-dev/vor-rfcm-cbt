export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entity, ids } = await req.json();
  if (!entity || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "entity and ids[] are required" }, { status: 400 });
  }

  if (!["students", "questions", "classes", "tests"].includes(entity)) {
    return NextResponse.json({ error: "Invalid entity" }, { status: 400 });
  }

  if (entity === "classes") {
    const { error: tcError } = await db.from("test_classes").delete().in("class_id", ids);
    if (tcError) return NextResponse.json({ error: tcError.message }, { status: 500 });

    const { error: studentError } = await db.from("students").delete().in("class_id", ids);
    if (studentError) return NextResponse.json({ error: studentError.message }, { status: 500 });

    const { error } = await db.from("classes").delete().in("id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: ids.length });
  }

  if (entity === "tests") {
    const attemptIds = (await db.from("attempts").select("id").in("test_id", ids)).data?.map((a: any) => a.id) ?? [];
    if (attemptIds.length > 0) {
      await db.from("answers").delete().in("attempt_id", attemptIds);
      await db.from("results").delete().in("attempt_id", attemptIds);
      await db.from("attempts").delete().in("id", attemptIds);
    }
    await db.from("test_classes").delete().in("test_id", ids);
    await db.from("questions").delete().in("test_id", ids);
    const { error } = await db.from("tests").delete().in("id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: ids.length });
  }

  if (entity === "questions") {
    await db.from("answers").delete().in("question_id", ids);
    const { error } = await db.from("questions").delete().in("id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: ids.length });
  }

  const { error } = await db.from(entity).delete().in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: ids.length });
}
