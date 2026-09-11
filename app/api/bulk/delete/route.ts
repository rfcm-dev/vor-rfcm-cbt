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

  const table = db.from(entity as any);

  if (entity === "classes") {
    const { data: linked } = await db.from("test_classes").select("class_id, test_id").in("class_id", ids).limit(1);
    if (linked && linked.length > 0) {
      const testIds = linked.map((l: any) => l.test_id);
      const { data: tests } = await db.from("tests").select("id, title").in("id", testIds);
      const blockedNames = (tests ?? []).map((t: any) => t.title).filter(Boolean);
      return NextResponse.json({ error: `Cannot delete: these classes are still published to exam(s): ${blockedNames.join(", ")}. Remove the class from those exams first.` }, { status: 409 });
    }
  }

  if (entity === "tests") {
    const { data: attempts } = await db.from("attempts").select("id, test_id").in("test_id", ids).limit(1);
    if (attempts && attempts.length > 0) {
      return NextResponse.json({ error: "Cannot delete: one or more selected exams have student attempts. Unpublish them instead." }, { status: 409 });
    }
    await db.from("test_classes").delete().in("test_id", ids);
    await db.from("questions").delete().in("test_id", ids);
  }

  if (entity === "questions") {
    const { data: answers } = await db.from("answers").select("id").in("question_id", ids).limit(1);
    if (answers && answers.length > 0) {
      return NextResponse.json({ error: "Cannot delete: one or more selected questions have student answers." }, { status: 409 });
    }
  }

  const { error } = await table.delete().in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: ids.length });
}
