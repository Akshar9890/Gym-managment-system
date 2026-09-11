// lib/auth/api-helpers.ts — Reusable helpers for API route auth/RBAC guards

import { NextRequest, NextResponse } from "next/server";
import { requireSession, AuthError, ForbiddenError } from "@/lib/auth/session";
import { requirePermission, Permission } from "@/lib/rbac";
import { Role } from "@prisma/client";

export interface AuthenticatedContext {
  userId: string;
  email: string;
  name: string;
  role: Role;
}

/**
 * Gets the current session or throws. Use in API routes.
 * Returns structured error responses instead of throwing to callers.
 */
export async function withAuth(
  handler: (ctx: AuthenticatedContext) => Promise<NextResponse>,
  _request?: NextRequest
): Promise<NextResponse> {
  try {
    const session = await requireSession();
    return await handler({
      userId: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error; // re-throw unexpected errors
  }
}

/**
 * Like withAuth, but also checks a specific permission.
 */
export function withPermission(permission: Permission) {
  return function (
    handler: (ctx: AuthenticatedContext) => Promise<NextResponse>
  ) {
    return async function (request?: NextRequest): Promise<NextResponse> {
      return withAuth(async (ctx) => {
        requirePermission(ctx.role, permission);
        return handler(ctx);
      }, request);
    };
  };
}

/**
 * Standard API error response helper
 */
export function apiError(
  message: string,
  status: number,
  details?: unknown
): NextResponse {
  const body: Record<string, unknown> = { error: message };
  if (details !== undefined && process.env.NODE_ENV !== "production") {
    body.details = details;
  }
  return NextResponse.json(body, { status });
}

/**
 * Wraps an async route handler and catches unhandled errors.
 * Returns a 500 with sanitized error (no stack traces in production).
 */
export function tryCatch(
  handler: (req: NextRequest) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (error) {
      console.error("[API Error]", error);
      if (error instanceof AuthError) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error instanceof ForbiddenError) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
