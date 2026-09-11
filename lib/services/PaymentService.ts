// lib/services/PaymentService.ts — Payment processing & receipt generation
// Per DECISIONS.md D6: Payment status is independent of membership status.
// Staff payments require admin verification before being verified.

import { prisma } from "@/lib/prisma";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { getNextReceiptNumber } from "./ReferenceService";
import { writeAuditLog, AuditAction } from "@/lib/auth/audit";

export interface RecordPaymentInput {
  membershipId: string;
  memberId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string | null;
  receivedById: string;
  paymentProof?: string | null;
  transactionReference?: string | null;
  isStaff?: boolean;
}

export interface PaymentSummary {
  totalPaid: number;
  finalAmount: number;
  balanceRemaining: number;
  paymentStatus: PaymentStatus;
}

/**
 * Calculates current payment summary for a membership based on recorded payments.
 * Only PAID and VERIFIED payments count towards the confirmed balance.
 */
export async function getMembershipPaymentSummary(
  membershipId: string,
  tx: typeof prisma = prisma
): Promise<PaymentSummary> {
  const membership = await tx.membership.findUnique({
    where: { id: membershipId },
    include: {
      payments: {
        where: {
          paymentStatus: {
            in: [PaymentStatus.PAID, PaymentStatus.VERIFIED],
          },
        },
      },
    },
  });

  if (!membership) {
    throw new Error("Membership not found");
  }

  const finalAmount = membership.finalAmount.toNumber();
  const totalPaid = membership.payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
  const balanceRemaining = Math.max(0, finalAmount - totalPaid);

  let paymentStatus: PaymentStatus = PaymentStatus.PENDING;
  if (totalPaid >= finalAmount) {
    paymentStatus = PaymentStatus.PAID;
  } else if (totalPaid > 0) {
    paymentStatus = PaymentStatus.PARTIAL;
  }

  return { totalPaid, finalAmount, balanceRemaining, paymentStatus };
}

/**
 * Records a new payment against a membership, updates the membership's paymentStatus,
 * and generates a unique sequential receipt number.
 */
export async function recordPayment(input: RecordPaymentInput) {
  if (input.amount <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }

  return await prisma.$transaction(async (tx) => {
    const membership = await tx.membership.findUnique({
      where: { id: input.membershipId },
    });

    if (!membership) {
      throw new Error("Membership not found");
    }

    const receiptNumber = await getNextReceiptNumber(tx as any);

    const initialStatus = input.isStaff
      ? PaymentStatus.PENDING_VERIFICATION
      : PaymentStatus.PAID;

    const payment = await tx.payment.create({
      data: {
        membershipId: input.membershipId,
        memberId: input.memberId,
        receivedById: input.receivedById || null,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        paymentStatus: initialStatus,
        paymentProof: input.paymentProof || null,
        transactionReference: input.transactionReference || null,
        verifiedById: input.isStaff ? null : input.receivedById,
        verifiedAt: input.isStaff ? null : new Date(),
        paidAt: new Date(),
        receiptNumber,
        notes: input.notes || null,
      },
      include: {
        member: true,
        membership: { include: { plan: true } },
      },
    });

    // Re-evaluate membership payment status (only for verified/admin payments)
    let summary: PaymentSummary;
    if (!input.isStaff) {
      summary = await getMembershipPaymentSummary(input.membershipId, tx as any);
      await tx.membership.update({
        where: { id: input.membershipId },
        data: { paymentStatus: summary.paymentStatus },
      });
    } else {
      summary = await getMembershipPaymentSummary(input.membershipId, tx as any);
    }

    // Audit log
    await writeAuditLog({
      userId: input.receivedById,
      action: AuditAction.RECORD_PAYMENT,
      entityType: "Payment",
      entityId: payment.id,
      newValues: {
        amount: input.amount,
        receiptNumber,
        paymentMethod: input.paymentMethod,
        status: initialStatus,
        newMembershipPaymentStatus: summary.paymentStatus,
        balanceRemaining: summary.balanceRemaining,
      },
    });

    return { payment, summary };
  });
}
