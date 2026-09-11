// app/api/plans/route.ts — Membership Plans API
// GET: list active plans (or all if includeInactive=true & ADMIN)
// POST: create new plan (ADMIN+ only)

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { Permission, requirePermission } from "@/lib/rbac";
import { writeAuditLog, AuditAction } from "@/lib/auth/audit";

const CreatePlanSchema = z.object({
  name: z.string().min(2, "Plan name must be at least 2 characters").max(100),
  durationMonths: z.number().int().min(1, "Duration must be at least 1 month").max(120),
  price: z.number().positive("Price must be greater than 0"),
  description: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const where = includeInactive ? {} : { isActive: true };

    const plans = await prisma.membershipPlan.findMany({
      where,
      orderBy: [{ durationMonths: "asc" }, { price: "asc" }],
    });

    return NextResponse.json({ success: true, data: plans });
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    requirePermission(session.role, Permission.CREATE_PLAN);

    const body = await req.json();
    const parsed = CreatePlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const plan = await prisma.membershipPlan.create({
      data: {
        name: parsed.data.name,
        durationMonths: parsed.data.durationMonths,
        price: parsed.data.price,
        description: parsed.data.description,
      },
    });

    await writeAuditLog({
      userId: session.userId,
      action: AuditAction.CREATE_PLAN,
      entityType: "MembershipPlan",
      entityId: plan.id,
      newValues: { name: plan.name, price: plan.price.toNumber(), durationMonths: plan.durationMonths },
    });

    return NextResponse.json({ success: true, data: plan }, { status: 201 });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (error.status === 403) return NextResponse.json({ success: false, error: "Forbidden: insufficient permissions" }, { status: 403 });
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
