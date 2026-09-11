// app/api/memberships/[id]/route.ts — Single Membership API
// Supports date override (ADMIN+ with OVERRIDE_MEMBERSHIP_DATES) and status update.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { Permission, requirePermission } from "@/lib/rbac";
import { writeAuditLog, AuditAction } from "@/lib/auth/audit";
import { normalizeCalendarDate } from "@/lib/services/MembershipDateService";
import { MembershipStatus } from "@prisma/client";

const UpdateMembershipSchema = z.object({
  membershipStatus: z.nativeEnum(MembershipStatus).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z.string().max(500).optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, Permission.READ_MEMBERSHIP);
    const { id } = await params;

    const membership = await prisma.membership.findUnique({
      where: { id },
      include: {
        member: true,
        plan: true,
        payments: {
          orderBy: { paidAt: "desc" },
        },
        notifications: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ success: false, error: "Membership not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: membership });
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
    const { id } = await params;

    const existing = await prisma.membership.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Membership not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = UpdateMembershipSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updateData: any = {};
    let auditAction: string = AuditAction.RENEW_MEMBERSHIP;

    // Check date override permission
    if (parsed.data.startDate || parsed.data.endDate) {
      requirePermission(session.role, Permission.OVERRIDE_MEMBERSHIP_DATES);
      auditAction = AuditAction.OVERRIDE_START_DATE;

      if (parsed.data.startDate) {
        updateData.startDate = normalizeCalendarDate(parsed.data.startDate);
      }
      if (parsed.data.endDate) {
        updateData.endDate = normalizeCalendarDate(parsed.data.endDate);
      }
    }

    if (parsed.data.membershipStatus) {
      requirePermission(session.role, Permission.UPDATE_MEMBERSHIP);
      updateData.membershipStatus = parsed.data.membershipStatus;
      if (parsed.data.membershipStatus === MembershipStatus.CANCELLED) {
        auditAction = AuditAction.CANCEL_MEMBERSHIP;
      } else if (parsed.data.membershipStatus === MembershipStatus.PAUSED) {
        auditAction = AuditAction.PAUSE_MEMBERSHIP;
      }
    }

    if (parsed.data.notes !== undefined) {
      updateData.notes = parsed.data.notes;
    }

    const updated = await prisma.membership.update({
      where: { id },
      data: updateData,
      include: { plan: true },
    });

    await writeAuditLog({
      userId: session.userId,
      action: auditAction,
      entityType: "Membership",
      entityId: id,
      oldValues: {
        status: existing.membershipStatus,
        startDate: existing.startDate.toISOString(),
        endDate: existing.endDate.toISOString(),
      },
      newValues: {
        status: updated.membershipStatus,
        startDate: updated.startDate.toISOString(),
        endDate: updated.endDate.toISOString(),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (error.status === 403) return NextResponse.json({ success: false, error: "Forbidden: insufficient permissions" }, { status: 403 });
    return NextResponse.json({ success: false, error: error.message || "Failed to update membership" }, { status: 500 });
  }
}
