// app/api/user/change-password/route.ts — Change Password endpoint
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
    confirmPassword: z.string().min(8, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirmation do not match",
    path: ["confirmPassword"],
  });

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();

    const parsed = ChangePasswordSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstErrorMessage = Object.values(fieldErrors).flat()[0] || "Invalid password data";
      return NextResponse.json(
        { success: false, error: firstErrorMessage, errors: fieldErrors },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const isValidCurrent = await verifyPassword(user.passwordHash, parsed.data.currentPassword);
    if (!isValidCurrent) {
      return NextResponse.json(
        { success: false, error: "Incorrect current password" },
        { status: 400 }
      );
    }

    const newPasswordHash = await bcrypt.hash(parsed.data.newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    await writeAuditLog({
      userId: user.id,
      action: AuditAction.CHANGE_PASSWORD,
      entityType: "User",
      entityId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/user/change-password]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update password" },
      { status: 500 }
    );
  }
}
