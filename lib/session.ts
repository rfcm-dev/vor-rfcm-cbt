import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE_NAME, SessionUser } from "@/lib/auth";

// Read the current staff user from the request cookie. Use in server components/route handlers.
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const user = await verifySessionToken(token);
  if (!user || user.role === "student") return null;
  return user as SessionUser;
}
