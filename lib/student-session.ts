import { cookies } from "next/headers";
import { verifySessionToken, STUDENT_SESSION_COOKIE_NAME, StudentSessionUser } from "@/lib/auth";

export async function getStudentSession(): Promise<StudentSessionUser | null> {
  const token = cookies().get(STUDENT_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token) as Promise<StudentSessionUser | null>;
}
