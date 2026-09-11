// middleware.ts — Route protection
// Runs on every request. Redirects unauthenticated users to /login.
// Role checks happen at the API layer, not here (middleware only guards nav).

import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/auth/session";

import { validateCsrf } from "@/lib/auth/csrf";

// Routes that don't need authentication
const PUBLIC_ROUTES = ["/login", "/api/auth/login"];

// API routes that are public (job endpoint is secured by its own secret)
const PUBLIC_API_PREFIXES = ["/api/auth/"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CSRF validation on API mutations
  if (pathname.startsWith("/api/")) {
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;
  }

  // Allow public routes
  if (
    PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return NextResponse.next();
  }

  // Check session
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  if (!session.isLoggedIn || !session.userId) {
    // For API routes, return 401 instead of redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
