import { db } from "@/lib/db";

export function calculatePercentage(earnedPoints: number, totalPossiblePoints: number): number {
  if (totalPossiblePoints <= 0) return 0;
  return Math.round((earnedPoints / totalPossiblePoints) * 100);
}

export async function getTotalPossiblePoints(testId: string): Promise<number> {
  const { data, error } = await db
    .from("questions")
    .select("points")
    .eq("test_id", testId);
  
  if (error || !data) return 0;
  return data.reduce((sum, q) => sum + Number(q.points ?? 0), 0);
}
