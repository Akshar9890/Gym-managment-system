// app/api/payments/route.ts — Payments API
// GET: list payments with filters (date range, memberId, paymentMethod, status)
// POST: record payment against a membership (routes staff submissions to verification)

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { Permission, requirePermission } from "@/lib/rbac";
import { recordPayment } from "@/lib/services/PaymentService";
import { PaymentMethod, PaymentStatus } from "@prisma/client";

const RecordPaymentSchema = z.object({
  membershipId: z.string().min(1, "Membership ID required"),
  memberId: z.string().min(1, "Member ID required"),
  amount: z.number().positive("Amount must be greater than 0"),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  notes: z.string().max(500).optional().nullable(),
  paymentProof: z.string().optional().nullable(),
  transactionReference: z.string().max(100).optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    requirePermission(session.role, Permission.READ_PAYMENT);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const memberId = searchParams.get("memberId");
    const method = searchParams.get("method") as PaymentMethod | null;
    const status = searchParams.get("status") as PaymentStatus | null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};
    if (memberId) where.memberId = memberId;
    if (method) where.paymentMethod = method;
    if (status) where.paymentStatus = status;
    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) where.paidAt.gte = new Date(startDate);
      if (endDate) where.paidAt.lte = new Date(endDate);
    }

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paidAt: "desc" },
        include: {
          member: {
            select: { id: true, fullName: true, phoneNumber: true, email: true },
          },
          receivedBy: {
            select: { id: true, name: true, email: true, role: true },
          },
          verifiedBy: {
            select: { id: true, name: true, email: true },
          },
          membership: {
            select: {
              id: true,
              membershipReference: true,
              startDate: true,
              endDate: true,
              finalAmount: true,
              membershipStatus: true,
              paymentStatus: true,
              plan: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (error.status === 403) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    requirePermission(session.role, Permission.RECORD_PAYMENT);

    const body = await req.json();
    const parsed = RecordPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const isStaff = session.role === "STAFF";

    const result = await recordPayment({
      membershipId: parsed.data.membershipId,
      memberId: parsed.data.memberId,
      amount: parsed.data.amount,
      paymentMethod: parsed.data.paymentMethod,
      notes: parsed.data.notes,
      paymentProof: parsed.data.paymentProof,
      transactionReference: parsed.data.transactionReference,
      receivedById: session.userId,
      isStaff,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (error.status === 403) return NextResponse.json({ success: false, error: "Forbidden: insufficient permissions" }, { status: 403 });
    return NextResponse.json({ success: false, error: error.message || "Failed to record payment" }, { status: 500 });
  }
}
