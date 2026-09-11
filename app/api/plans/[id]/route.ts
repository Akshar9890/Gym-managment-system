// app/api/plans/[id]/route.ts — Single Plan API
// GET: fetch plan
// PATCH: update plan (ADMIN+ only)
// DELETE: deactivate plan (ADMIN+ only)

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { Permission, requirePermission } from "@/lib/rbac";
import { writeAuditLog, AuditAction } from "@/lib/auth/audit";

const UpdatePlanSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  durationMonths: z.number().int().min(0).max(120).optional(),
  durationDays: z.number().int().min(0).max(365).optional(),
  price: z.number().positive("Price must be positive").optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;

    const plan = await prisma.membershipPlan.findUnique({
      where: { id },
      include: {
        _count: {
          select: { memberships: true },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ success: false, error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: plan });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, Permission.UPDATE_PLAN);
    const { id } = await params;

    const existing = await prisma.membershipPlan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Plan not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = UpdatePlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updated = await prisma.membershipPlan.update({
      where: { id },
      data: parsed.data,
    });

    await writeAuditLog({
      userId: session.userId,
      action: AuditAction.UPDATE_PLAN,
      entityType: "MembershipPlan",
      entityId: id,
      oldValues: { name: existing.name, price: existing.price.toNumber(), isActive: existing.isActive },
      newValues: { name: updated.name, price: updated.price.toNumber(), isActive: updated.isActive },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (error.status === 403) return NextResponse.json({ success: false, error: "Forbidden: insufficient permissions" }, { status: 403 });
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, Permission.DEACTIVATE_PLAN);
    const { id } = await params;

    const existing = await prisma.membershipPlan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Plan not found" }, { status: 404 });
    }

    // Soft delete / deactivate to preserve historical referential integrity
    const updated = await prisma.membershipPlan.update({
      where: { id },
      data: { isActive: false },
    });

    await writeAuditLog({
      userId: session.userId,
      action: AuditAction.DEACTIVATE_PLAN,
      entityType: "MembershipPlan",
      entityId: id,
      oldValues: { isActive: existing.isActive },
      newValues: { isActive: false },
    });

    return NextResponse.json({ success: true, message: "Plan deactivated", data: updated });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (error.status === 403) return NextResponse.json({ success: false, error: "Forbidden: insufficient permissions" }, { status: 403 });
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
