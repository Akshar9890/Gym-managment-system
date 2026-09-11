// app/api/memberships/route.ts — Memberships creation API
// Implements D1 renewal continuity: if renewing, startDate auto-aligns to previous endDate + 1 day
// Locks in priceAtPurchase per non-negotiable requirement.
// Sets PENDING_VERIFICATION for staff-submitted payments/memberships.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { Permission, requirePermission } from "@/lib/rbac";
import { writeAuditLog, AuditAction } from "@/lib/auth/audit";
import {
  calculateEndDate,
  calculateRenewalStartDate,
  normalizeCalendarDate,
  findConflictingMembership,
} from "@/lib/services/MembershipDateService";
import {
  getNextMembershipReference,
  getNextReceiptNumber,
} from "@/lib/services/ReferenceService";
import { todayInKolkata } from "@/lib/utils";
import { MembershipStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

const CreateMembershipSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
  planId: z.string().min(1, "Plan ID is required"),
  startDate: z.string().optional(),
  discountAmount: z.number().min(0).default(0),
  discount: z.number().min(0).optional(),
  isRenewal: z.boolean().default(false),
  notes: z.string().max(1000).optional().nullable(),
  initialPayment: z.object({
    amountPaid: z.number().min(0).optional(),
    amount: z.number().min(0).optional(),
    paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
    paymentNotes: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    paymentProof: z.string().optional().nullable(),
    transactionReference: z.string().max(100).optional().nullable(),
  }).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    requirePermission(session.role, Permission.CREATE_MEMBERSHIP);

    const body = await req.json();
    const parsed = CreateMembershipSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { memberId, planId, startDate: customStartDate, isRenewal, initialPayment } = parsed.data;

    // Verify member exists
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        memberships: {
          orderBy: { endDate: "desc" },
          take: 1,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
    }

    // Verify plan exists
    const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ success: false, error: "Plan not found" }, { status: 404 });
    }

    // Determine start date
    let effectiveStartDate: Date;
    const latestMembership = member.memberships[0];

    if (customStartDate) {
      effectiveStartDate = normalizeCalendarDate(customStartDate);
    } else if (isRenewal && latestMembership) {
      // Per D1: Renewal continuity = previous endDate + 1 day
      effectiveStartDate = calculateRenewalStartDate(latestMembership.endDate);
    } else {
      effectiveStartDate = todayInKolkata();
    }

    // Calculate inclusive end date
    const calculatedEndDate = calculateEndDate(effectiveStartDate, {
      durationMonths: plan.durationMonths,
    });

    // Enforce Rule 3: Renewals must never create overlapping date ranges for the same member
    const conflict = await findConflictingMembership(
      member.id,
      effectiveStartDate,
      calculatedEndDate
    );

    if (conflict.hasOverlap) {
      return NextResponse.json(
        {
          success: false,
          error: "Membership date overlap detected",
          details: conflict.error,
        },
        { status: 409 }
      );
    }

    const effectiveDiscount = parsed.data.discountAmount || parsed.data.discount || 0;
    const planPrice = plan.price.toNumber();
    const finalPrice = Math.max(0, planPrice - effectiveDiscount);

    const initial = parsed.data.initialPayment;
    const amountPaid = initial?.amountPaid !== undefined && initial.amountPaid !== null
      ? initial.amountPaid
      : (initial?.amount ?? 0);
    const pMethod = initial?.paymentMethod || PaymentMethod.CASH;
    const pNotes = initial?.paymentNotes || initial?.notes || parsed.data.notes || null;
    const pProof = initial?.paymentProof || null;
    const pTransRef = initial?.transactionReference || null;

    const isStaff = session.role === "STAFF";

    // Verification gate:
    // If staff creates membership, it must wait for admin verification.
    // If admin creates membership, it can be immediately active.
    let initialMembershipStatus: MembershipStatus;
    let initialPaymentStatus: PaymentStatus;
    let verifiedById: string | null = null;
    let verifiedAt: Date | null = null;

    if (isStaff) {
      initialMembershipStatus = MembershipStatus.PENDING_VERIFICATION;
      initialPaymentStatus = PaymentStatus.PENDING_VERIFICATION;
    } else {
      initialMembershipStatus = MembershipStatus.ACTIVE;
      verifiedById = session.userId;
      verifiedAt = new Date();
      if (amountPaid >= finalPrice) {
        initialPaymentStatus = PaymentStatus.PAID;
      } else if (amountPaid > 0) {
        initialPaymentStatus = PaymentStatus.PARTIAL;
      } else {
        initialPaymentStatus = PaymentStatus.PENDING;
      }
    }

    // Atomic creation
    const result = await prisma.$transaction(async (tx) => {
      const membershipReference = await getNextMembershipReference(tx as any);

      const membership = await tx.membership.create({
        data: {
          membershipReference,
          memberId: member.id,
          planId: plan.id,
          startDate: effectiveStartDate,
          endDate: calculatedEndDate,
          durationMonths: plan.durationMonths,
          priceAtPurchase: plan.price, // Lock in price
          discount: effectiveDiscount,
          finalAmount: finalPrice,
          membershipStatus: initialMembershipStatus,
          paymentStatus: initialPaymentStatus,
          verifiedById,
          verifiedAt,
          notes: parsed.data.notes || null,
          createdById: session.userId,
        },
        include: {
          plan: true,
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      // When renewing in advance and active: if earlier membership was EXPIRING_SOON, revert it back to ACTIVE
      if (!isStaff) {
        await tx.membership.updateMany({
          where: {
            memberId: member.id,
            id: { not: membership.id },
            membershipStatus: MembershipStatus.EXPIRING_SOON,
          },
          data: {
            membershipStatus: MembershipStatus.ACTIVE,
          },
        });
      }

      let paymentRecord = null;
      if (initial && amountPaid > 0) {
        const receiptNumber = await getNextReceiptNumber(tx as any);

        paymentRecord = await tx.payment.create({
          data: {
            memberId: member.id,
            membershipId: membership.id,
            receivedById: session.userId,
            amount: amountPaid,
            paymentMethod: pMethod,
            paymentStatus: initialPaymentStatus,
            paymentProof: pProof,
            transactionReference: pTransRef,
            verifiedById,
            verifiedAt,
            paidAt: new Date(),
            receiptNumber,
            notes: pNotes,
          },
        });
      }

      return { membership, payment: paymentRecord };
    });

    await writeAuditLog({
      userId: session.userId,
      action: isRenewal ? AuditAction.RENEW_MEMBERSHIP : AuditAction.CREATE_MEMBERSHIP,
      entityType: "Membership",
      entityId: result.membership.id,
      newValues: {
        membershipReference: result.membership.membershipReference,
        memberId: member.id,
        planName: plan.name,
        startDate: effectiveStartDate.toISOString(),
        endDate: calculatedEndDate.toISOString(),
        finalPrice,
        status: initialMembershipStatus,
        isRenewal,
      },
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (error.status === 403) return NextResponse.json({ success: false, error: "Forbidden: insufficient permissions" }, { status: 403 });
    return NextResponse.json({ success: false, error: error.message || "Failed to create membership" }, { status: 500 });
  }
}
