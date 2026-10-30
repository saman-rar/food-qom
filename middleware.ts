/**
 * Next.js Middleware
 * Authentication and authorization protection
 */

import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

const publicPaths = ["/login", "/api/auth"];
const adminPaths = ["/admin", "/api/admin"];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAdmin = req.auth?.user?.role === "ADMIN";
  const path = req.nextUrl.pathname;

  // Allow public paths
  if (publicPaths.some((p) => path.startsWith(p))) {
    return NextResponse.next();
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  // Check admin routes
  if (adminPaths.some((p) => path.startsWith(p))) {
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", req.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)",
  ],
};