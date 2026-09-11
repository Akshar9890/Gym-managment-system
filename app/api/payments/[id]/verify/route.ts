// app/api/payments/[id]/verify/route.ts — Payment Verification API
// Dedicated endpoint for Admin / Super Admin to Approve or Reject payment records.
// Enforces:
// 1. Only users with VERIFY_PAYMENT permission can access.
// 2. Staff self-approval is strictly forbidden (cannot approve payments you recorded).
// 3. Approval activates the membership (PENDING_VERIFICATION -> ACTIVE, VERIFIED).
// 4. Rejection marks payment and associated pending membership as REJECTED with mandatory reason.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { Permission, requirePermission } from "@/lib/rbac";
import { writeAuditLog, AuditAction } from "@/lib/auth/audit";
import { MembershipStatus, PaymentStatus } from "@prisma/client";

const VerifyPaymentSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  rejectionReason: z.string().max(500).optional(),
}).refine(
  (data) => {
    if (data.action === "REJECT") {
      return !!data.rejectionReason && data.rejectionReason.trim().length >= 3;
    }
    return true;
  },
  {
    message: "Rejection reason is required and must be at least 3 characters when rejecting",
    path: ["rejectionReason"],
  }
);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, Permission.VERIFY_PAYMENT);

    const { id: paymentId } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        membership: {
          include: {
            payments: true,
          },
        },
        member: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ success: false, error: "Payment not found" }, { status: 404 });
    }

    if (payment.paymentStatus !== PaymentStatus.PENDING_VERIFICATION) {
      return NextResponse.json(
        {
          success: false,
          error: `Payment is already ${payment.paymentStatus.toLowerCase()} and cannot be verified again`,
        },
        { status: 400 }
      );
    }

    // Prevent staff self-approval even if staff manages to hit the API
    if (payment.receivedById === session.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Self-approval is forbidden. An independent admin must verify this payment.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = VerifyPaymentSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0] || "Invalid input";
      return NextResponse.json({ success: false, error: firstError }, { status: 400 });
    }

    const { action, rejectionReason } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();

      if (action === "APPROVE") {
        // 1. Mark payment as VERIFIED
        const updatedPayment = await tx.payment.update({
          where: { id: paymentId },
          data: {
            paymentStatus: PaymentStatus.VERIFIED,
            verifiedById: session.userId,
            verifiedAt: now,
            rejectionReason: null,
          },
        });

        // 2. Re-evaluate membership status and payment status
        const membership = payment.membership;
        const allVerifiedPayments = await tx.payment.findMany({
          where: {
            membershipId: membership.id,
            paymentStatus: { in: [PaymentStatus.VERIFIED, PaymentStatus.PAID] },
          },
        });

        const totalVerifiedAmount = allVerifiedPayments.reduce(
          (sum, p) => sum + p.amount.toNumber(),
          0
        );
        const finalAmount = membership.finalAmount.toNumber();

        let newMembershipPaymentStatus: PaymentStatus = PaymentStatus.PENDING;
        if (totalVerifiedAmount >= finalAmount) {
          newMembershipPaymentStatus = PaymentStatus.PAID;
        } else if (totalVerifiedAmount > 0) {
          newMembershipPaymentStatus = PaymentStatus.PARTIAL;
        }

        // Activate membership if it was pending verification
        const updateMembershipData: any = {
          paymentStatus: newMembershipPaymentStatus,
        };

        if (membership.membershipStatus === MembershipStatus.PENDING_VERIFICATION) {
          updateMembershipData.membershipStatus = MembershipStatus.ACTIVE;
          updateMembershipData.verifiedById = session.userId;
          updateMembershipData.verifiedAt = now;
          updateMembershipData.rejectionReason = null;
        }

        const updatedMembership = await tx.membership.update({
          where: { id: membership.id },
          data: updateMembershipData,
        });

        // Revert any earlier EXPIRING_SOON membership to ACTIVE if renewal is approved
        await tx.membership.updateMany({
          where: {
            memberId: payment.memberId,
            id: { not: membership.id },
            membershipStatus: MembershipStatus.EXPIRING_SOON,
          },
          data: {
            membershipStatus: MembershipStatus.ACTIVE,
          },
        });

        return { payment: updatedPayment, membership: updatedMembership };
      } else {
        // REJECT
        const updatedPayment = await tx.payment.update({
          where: { id: paymentId },
          data: {
            paymentStatus: PaymentStatus.REJECTED,
            verifiedById: session.userId,
            verifiedAt: now,
            rejectionReason: rejectionReason?.trim() || null,
          },
        });

        // If the membership was pending and has no verified payments, mark membership as REJECTED
        const membership = payment.membership;
        const remainingVerified = await tx.payment.count({
          where: {
            membershipId: membership.id,
            id: { not: paymentId },
            paymentStatus: { in: [PaymentStatus.VERIFIED, PaymentStatus.PAID] },
          },
        });

        let updatedMembership: any = membership;
        if (
          remainingVerified === 0 &&
          membership.membershipStatus === MembershipStatus.PENDING_VERIFICATION
        ) {
          updatedMembership = await tx.membership.update({
            where: { id: membership.id },
            data: {
              membershipStatus: MembershipStatus.REJECTED,
              verifiedById: session.userId,
              verifiedAt: now,
              rejectionReason: rejectionReason?.trim() || null,
            },
          });
        }

        return { payment: updatedPayment, membership: updatedMembership };
      }
    });

    // Write audit log
    await writeAuditLog({
      userId: session.userId,
      action: action === "APPROVE" ? AuditAction.VERIFY_PAYMENT : AuditAction.REJECT_PAYMENT,
      entityType: "Payment",
      entityId: payment.id,
      newValues: {
        action,
        receiptNumber: payment.receiptNumber,
        membershipReference: payment.membership.membershipReference,
        member: payment.member.fullName,
        amount: payment.amount.toNumber(),
        rejectionReason: action === "REJECT" ? rejectionReason : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
      message:
        action === "APPROVE"
          ? `Payment ${payment.receiptNumber} approved successfully. Membership is now active.`
          : `Payment ${payment.receiptNumber} rejected.`,
    });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (error.status === 403) return NextResponse.json({ success: false, error: error.message || "Forbidden" }, { status: 403 });
    console.error("Verification error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
