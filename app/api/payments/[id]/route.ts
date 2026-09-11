// app/api/payments/[id]/route.ts — Single Payment API

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { Permission, requirePermission } from "@/lib/rbac";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, Permission.READ_PAYMENT);
    const { id } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        member: true,
        membership: {
          include: {
            plan: true,
            payments: {
              orderBy: { paidAt: "desc" },
            },
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ success: false, error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: payment });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (error.status === 403) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
