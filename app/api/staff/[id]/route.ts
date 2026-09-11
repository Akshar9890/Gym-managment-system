// app/api/staff/[id]/route.ts — Single Staff Member Details and Update API
// ADMIN and SUPER_ADMIN only.
// Enables view, profile editing, and activation/deactivation (no destructive permanent delete).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { Permission, requirePermission } from "@/lib/rbac";
import { isValidIndianPhone, normalizeIndianPhone } from "@/lib/validation/indian-phone";
import { writeAuditLog, AuditAction } from "@/lib/auth/audit";

const UpdateStaffSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100).optional(),
  phone: z
    .string()
    .trim()
    .refine(isValidIndianPhone, {
      message: "Please enter a valid 10-digit Indian phone number starting with 6-9",
    })
    .optional()
    .nullable(),
  email: z.string().trim().email("Invalid email address").optional(),
  profilePhoto: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, Permission.MANAGE_STAFF);

    const { id } = await params;

    const staff = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        profilePhoto: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        membershipsCreated: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            plan: true,
            member: {
              select: { id: true, fullName: true, phoneNumber: true },
            },
          },
        },
        paymentsReceived: {
          orderBy: { paidAt: "desc" },
          take: 20,
          include: {
            member: {
              select: { id: true, fullName: true, phoneNumber: true },
            },
          },
        },
      },
    });

    if (!staff) {
      return NextResponse.json({ success: false, error: "Staff member not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: staff });
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
    console.error("[GET /api/staff/[id]]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch staff member" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, Permission.MANAGE_STAFF);

    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateStaffSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstErrorMessage = Object.values(fieldErrors).flat()[0] || "Invalid input";
      return NextResponse.json(
        { success: false, error: firstErrorMessage, errors: fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Staff member not found" }, { status: 404 });
    }

    // Protect SUPER_ADMIN from accidental deactivation or demotion
    if (existing.role === "SUPER_ADMIN" && parsed.data.isActive === false) {
      return NextResponse.json(
        { success: false, error: "Super Admin accounts cannot be deactivated" },
        { status: 400 }
      );
    }

    // Check email uniqueness if changing email
    if (parsed.data.email && parsed.data.email.toLowerCase() !== existing.email.toLowerCase()) {
      const emailConflict = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase().trim() },
      });
      if (emailConflict) {
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
      updateData.phone = parsed.data.phone ? normalizeIndianPhone(parsed.data.phone) || parsed.data.phone : null;
    }
    if (parsed.data.profilePhoto !== undefined) updateData.profilePhoto = parsed.data.profilePhoto;
    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        profilePhoto: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Determine audit action
    let auditAction: string = AuditAction.UPDATE_STAFF;
    if (parsed.data.isActive !== undefined && parsed.data.isActive !== existing.isActive) {
      auditAction = parsed.data.isActive ? AuditAction.ACTIVATE_STAFF : AuditAction.DEACTIVATE_STAFF;
    }

    await writeAuditLog({
      userId: session.userId,
      action: auditAction,
      entityType: "User",
      entityId: existing.id,
      oldValues: {
        name: existing.name,
        email: existing.email,
        phone: existing.phone,
        isActive: existing.isActive,
      },
      newValues: {
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        isActive: updated.isActive,
      },
    });

    return NextResponse.json({ success: true, data: updated });
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
    console.error("[PATCH /api/staff/[id]]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update staff member" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, Permission.MANAGE_STAFF);

    const { id } = await params;

    const existing = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            membersCreated: true,
            membershipsCreated: true,
            paymentsReceived: true,
            auditLogs: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Staff member not found" }, { status: 404 });
    }

    if (existing.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Super Admin accounts cannot be removed" },
        { status: 400 }
      );
    }

    if (existing.id === session.userId) {
      return NextResponse.json(
        { success: false, error: "You cannot remove your own account" },
        { status: 400 }
      );
    }

    // Determine if user has related records that require preserving foreign key integrity
    const hasRelations =
      existing._count.membersCreated > 0 ||
      existing._count.membershipsCreated > 0 ||
      existing._count.paymentsReceived > 0 ||
      existing._count.auditLogs > 0;

    if (!hasRelations) {
      await prisma.user.delete({
        where: { id: existing.id },
      });
    } else {
      // Soft-delete / deactivate so historical receipts and audits remain valid
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          isActive: false,
        },
      });
    }

    await writeAuditLog({
      userId: session.userId,
      action: AuditAction.DELETE_STAFF,
      entityType: "User",
      entityId: existing.id,
      oldValues: {
        name: existing.name,
        email: existing.email,
        isActive: existing.isActive,
      },
      newValues: {
        isActive: false,
        permanentlyDeleted: !hasRelations,
      },
    });

    return NextResponse.json({
      success: true,
      message: hasRelations
        ? `Staff member "${existing.name}" deactivated and removed from active operations.`
        : `Staff member "${existing.name}" removed successfully.`,
      permanentlyDeleted: !hasRelations,
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
    console.error("[DELETE /api/staff/[id]]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to remove staff member" },
      { status: 500 }
    );
  }
}
