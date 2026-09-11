// app/api/members/[id]/route.ts — Member Details, Update, and Deactivation API

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { Permission, requirePermission } from "@/lib/rbac";
import { writeAuditLog, AuditAction } from "@/lib/auth/audit";
import { isValidIndianPhone, normalizeIndianPhone } from "@/lib/validation/indian-phone";
import { Gender, MemberStatus } from "@prisma/client";

const UpdateMemberSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phoneNumber: z.string().refine(isValidIndianPhone, { message: "Invalid Indian phone number" }).optional(),
  whatsappNumber: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.nativeEnum(Gender).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  emergencyContactName: z.string().max(100).optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  profilePhoto: z.string().optional().nullable(),
  status: z.nativeEnum(MemberStatus).optional(),
  whatsappVerified: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, Permission.READ_MEMBER);
    const { id } = await params;

    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        memberships: {
          orderBy: { startDate: "desc" },
          include: {
            plan: true,
            createdBy: {
              select: { id: true, name: true, email: true },
            },
            verifiedBy: {
              select: { id: true, name: true, email: true },
            },
            payments: {
              orderBy: { paidAt: "desc" },
              include: {
                receivedBy: {
                  select: { id: true, name: true, email: true },
                },
                verifiedBy: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
            notifications: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
        payments: {
          orderBy: { paidAt: "desc" },
          include: {
            receivedBy: {
              select: { id: true, name: true, email: true },
            },
            verifiedBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        notifications: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: member });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (error.status === 403) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, Permission.UPDATE_MEMBER);
    const { id } = await params;

    const existing = await prisma.member.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = UpdateMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const updateData: any = { ...data };

    if (data.phoneNumber) {
      updateData.phoneNumber = normalizeIndianPhone(data.phoneNumber);
    }
    if (data.whatsappNumber) {
      updateData.whatsappNumber = normalizeIndianPhone(data.whatsappNumber);
    }
    if (data.emergencyContactPhone) {
      updateData.emergencyContactPhone = normalizeIndianPhone(data.emergencyContactPhone);
    }
    if (data.dateOfBirth !== undefined) {
      updateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    }

    const updated = await prisma.member.update({
      where: { id: existing.id },
      data: updateData,
    });

    await writeAuditLog({
      userId: session.userId,
      action: AuditAction.UPDATE_MEMBER,
      entityType: "Member",
      entityId: existing.id,
      oldValues: { fullName: existing.fullName, phoneNumber: existing.phoneNumber, status: existing.status },
      newValues: { fullName: updated.fullName, phoneNumber: updated.phoneNumber, status: updated.status },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (error.status === 403) return NextResponse.json({ success: false, error: "Forbidden: insufficient permissions" }, { status: 403 });
    return NextResponse.json({ success: false, error: error.message || "Failed to update member" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, Permission.DELETE_MEMBER);
    const { id } = await params;

    const existing = await prisma.member.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
    }

    // Soft deactivate per RULES.md (never hard-delete data with payment or membership history)
    const updated = await prisma.member.update({
      where: { id: existing.id },
      data: { status: MemberStatus.INACTIVE },
    });

    await writeAuditLog({
      userId: session.userId,
      action: AuditAction.DEACTIVATE_MEMBER,
      entityType: "Member",
      entityId: existing.id,
      oldValues: { status: existing.status },
      newValues: { status: MemberStatus.INACTIVE },
    });

    return NextResponse.json({ success: true, message: "Member deactivated", data: updated });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (error.status === 403) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ success: false, error: error.message || "Failed to deactivate member" }, { status: 500 });
  }
}
