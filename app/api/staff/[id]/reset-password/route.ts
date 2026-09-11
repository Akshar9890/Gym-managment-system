// app/api/staff/[id]/reset-password/route.ts — Admin Staff Password Reset Endpoint
// ADMIN and SUPER_ADMIN only.
// Securely resets a staff member's password. Never logs passwords or exposes hashes.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { Permission, requirePermission } from "@/lib/rbac";
import { writeAuditLog, AuditAction } from "@/lib/auth/audit";

const ResetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password confirmation must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, Permission.MANAGE_STAFF);

    const { id } = await params;
    const body = await req.json();
    const parsed = ResetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, error: "Staff member not found" }, { status: 404 });
    }

    // Only SUPER_ADMIN can reset another ADMIN / SUPER_ADMIN password
    if (targetUser.role !== "STAFF" && session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: only Super Admin can reset administrative passwords" },
        { status: 403 }
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    await prisma.user.update({
      where: { id: targetUser.id },
      data: { passwordHash },
    });

    // Write audit log (NEVER include plain password or hash)
    await writeAuditLog({
      userId: session.userId,
      action: AuditAction.RESET_STAFF_PASSWORD,
      entityType: "User",
      entityId: targetUser.id,
      metadata: {
        targetEmail: targetUser.email,
        targetName: targetUser.name,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Password reset successfully for ${targetUser.name}`,
    });
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (error.status === 403) {
      return NextResponse.json(
        { success: false, error: "Forbidden: insufficient permissions" },
        { status: 403 }
      );
    }
    console.error("[POST /api/staff/[id]/reset-password]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reset password" },
      { status: 500 }
    );
  }
}
