import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME, STUDENT_SESSION_COOKIE_NAME } from "@/lib/auth";

// Protect everything under /dashboard. Public routes (/login, /exam, /check-results)
// are untouched. Superadmin-only routes (/dashboard/admins) get a role check here too.
export async function middleware(req: NextRequest) {
  const staffToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const studentToken = req.cookies.get(STUDENT_SESSION_COOKIE_NAME)?.value;
  const staffUser = staffToken ? await verifySessionToken(staffToken) : null;
  const studentUser = studentToken ? await verifySessionToken(studentToken) : null;

  if (req.nextUrl.pathname.startsWith("/dashboard")) {
    if (!staffUser) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (req.nextUrl.pathname.startsWith("/dashboard/admins") && !["superadmin", "admin"].includes(staffUser.role)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (req.nextUrl.pathname.startsWith("/student/dashboard")) {
    if (!studentUser) {
      return NextResponse.redirect(new URL("/student/login", req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/student/dashboard/:path*"],
};
