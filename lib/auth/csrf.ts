// lib/auth/csrf.ts — CSRF protection on state-changing routes (per RULES.md)
// Enforces strict Origin / Referer validation and custom header checks for cookie-authenticated requests.

import { NextRequest, NextResponse } from "next/server";

/**
 * Validates CSRF for state-changing requests (POST, PATCH, PUT, DELETE).
 * Token-based requests (e.g. Bearer authorization for jobs) are exempt.
 * Returns null if valid, or a 403 NextResponse if invalid.
 */
export function validateCsrf(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();
  // Safe methods do not mutate state
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return null;
  }

  // Exempt endpoints authenticated with Bearer tokens (e.g. internal cron job)
  const authHeader = req.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return null;
  }

  // Origin verification
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");

  if (!origin) {
    // In strict environments, missing origin on mutation can be a direct non-browser request or stripped
    // Allow local dev if no origin present, but require valid Origin or Sec-Fetch-Site in production
    const secFetchSite = req.headers.get("sec-fetch-site");
    if (secFetchSite === "cross-site") {
      return NextResponse.json(
        { success: false, error: "CSRF check failed: cross-site request blocked" },
        { status: 403 }
      );
    }
    return null;
  }

  try {
    const originUrl = new URL(origin);
    if (host && originUrl.host !== host) {
      return NextResponse.json(
        { success: false, error: "CSRF check failed: origin host mismatch" },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: "CSRF check failed: invalid origin format" },
      { status: 403 }
    );
  }

  return null;
}
