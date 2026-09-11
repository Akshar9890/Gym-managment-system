// app/api/user/profile/route.ts — User Profile Management (Admin & Staff)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, getSession } from "@/lib/auth/session";
import { isValidIndianPhone, normalizeIndianPhone } from "@/lib/validation/indian-phone";
import { writeAuditLog, AuditAction } from "@/lib/auth/audit";

const UpdateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100).optional(),
  email: z.string().trim().email("Please enter a valid email address").optional(),
  phone: z
    .string()
    .trim()
    .refine((val) => !val || isValidIndianPhone(val), {
      message: "Please enter a valid 10-digit Indian phone number starting with 6-9",
    })
    .optional()
    .nullable(),
  profilePhoto: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const session = await requireSession();

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        profilePhoto: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/user/profile]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load user profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();

    const parsed = UpdateProfileSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstErrorMessage = Object.values(fieldErrors).flat()[0] || "Invalid input";
      return NextResponse.json(
        { success: false, error: firstErrorMessage, errors: fieldErrors },
        { status: 400 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!currentUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Check email uniqueness if email is changed
    if (parsed.data.email && parsed.data.email.toLowerCase() !== currentUser.email.toLowerCase()) {
      const normalizedEmail = parsed.data.email.toLowerCase().trim();
      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existing && existing.id !== currentUser.id) {
        return NextResponse.json(
          { success: false, error: "An account with this email address already exists" },
          { status: 409 }
        );
      }
    }

    const updateData: any = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.email !== undefined) updateData.email = parsed.data.email.toLowerCase().trim();
    if (parsed.data.phone !== undefined) {
      updateData.phone = parsed.data.phone
        ? normalizeIndianPhone(parsed.data.phone) || parsed.data.phone
        : null;
    }
    if (parsed.data.profilePhoto !== undefined) {
      updateData.profilePhoto = parsed.data.profilePhoto;
    }

    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        profilePhoto: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    // Refresh active session cookie with updated identity info
    const currentSession = await getSession();
    currentSession.name = updatedUser.name;
    currentSession.email = updatedUser.email;
    currentSession.profilePhoto = updatedUser.profilePhoto;
    await currentSession.save();

    await writeAuditLog({
      userId: currentUser.id,
      action: AuditAction.UPDATE_USER,
      entityType: "User",
      entityId: currentUser.id,
      oldValues: {
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone,
      },
      newValues: {
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        hasPhoto: Boolean(updatedUser.profilePhoto),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: "Profile updated successfully",
    });
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("[PATCH /api/user/profile]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}
