// app/api/staff/change-password/route.ts — Staff Self Password Change API
// Allows an authenticated staff member to update their own password.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { writeAuditLog, AuditAction } from "@/lib/auth/audit";

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirmation password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  });

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();

    const body = await req.json();
    const parsed = ChangePasswordSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstErrorMessage = Object.values(fieldErrors).flat()[0] || "Invalid input";
      return NextResponse.json(
        { success: false, error: firstErrorMessage, errors: fieldErrors },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: "Account not found or inactive" },
        { status: 401 }
      );
    }

    const isCurrentValid = await verifyPassword(user.passwordHash, currentPassword);
    if (!isCurrentValid) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    await writeAuditLog({
      userId: session.userId,
      action: AuditAction.CHANGE_PASSWORD,
      entityType: "User",
      entityId: user.id,
      metadata: { action: "SELF_PASSWORD_CHANGE" },
    });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/staff/change-password]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to change password" },
      { status: 500 }
    );
  }
}
