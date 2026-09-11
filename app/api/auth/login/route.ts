// app/api/auth/login/route.ts — Login endpoint
// Rate-limited, validates credentials server-side, sets HTTP-only session cookie.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/session";
import { writeAuditLog, AuditAction } from "@/lib/auth/audit";

import { checkRateLimit, resetRateLimit } from "@/lib/auth/rate-limit";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit check: 5 attempts per 15 minutes per IP
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown-client";
    const rateLimit = checkRateLimit(`login:${clientIp}`, 5, 15 * 60 * 1000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many login attempts. Please try again later.",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds || 60) },
        }
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Find user strictly by email (case-insensitive)
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: "insensitive" },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
        profilePhoto: true,
        isActive: true,
      },
    });

    // Inactive staff accounts must not log in. Return generic authentication error.
    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Invalid credentials or account inactive" },
        { status: 401 }
      );
    }

    const isPasswordValid = await verifyPassword(user.passwordHash, password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid credentials or account inactive" },
        { status: 401 }
      );
    }

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Set session — role is read from DB, never from client
    const session = await getSession();
    session.userId = user.id;
    session.email = user.email;
    session.name = user.name;
    session.role = user.role;
    session.profilePhoto = user.profilePhoto;
    session.isLoggedIn = true;
    await session.save();

    // Reset rate limit on successful login
    resetRateLimit(`login:${clientIp}`);

    // Audit the login (no credentials in metadata)
    await writeAuditLog({
      userId: user.id,
      action: AuditAction.USER_LOGIN,
      entityType: "User",
      entityId: user.id,
      ipAddress: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? undefined,
    });

    const redirectUrl = user.role === "STAFF" ? "/staff" : "/dashboard";

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      redirectUrl,
    });
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
