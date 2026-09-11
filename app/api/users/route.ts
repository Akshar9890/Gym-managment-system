// app/api/users/route.ts — User management (SUPER_ADMIN only)
// GET: list users, POST: create user

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { requirePermission, Permission } from "@/lib/rbac";
import { hashPassword } from "@/lib/auth/password";
import { writeAuditLog, AuditAction } from "@/lib/auth/audit";
import { tryCatch } from "@/lib/auth/api-helpers";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and a number"
    ),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "STAFF"]).default("STAFF"),
});

export const GET = tryCatch(async (_req: NextRequest) => {
  const session = await requireSession();
  requirePermission(session.role, Permission.MANAGE_USERS);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
});

export const POST = tryCatch(async (req: NextRequest) => {
  const session = await requireSession();
  requirePermission(session.role, Permission.MANAGE_USERS);

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, name, password, role } = parsed.data;

  // Check for duplicate email
  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      passwordHash: await hashPassword(password),
      role,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  await writeAuditLog({
    userId: session.userId,
    action: AuditAction.CREATE_USER,
    entityType: "User",
    entityId: user.id,
    newValues: { email: user.email, name: user.name, role: user.role },
    // NEVER log the password hash
  });

  return NextResponse.json(user, { status: 201 });
});
