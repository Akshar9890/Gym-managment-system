// app/api/payments/[id]/receipt/route.ts — Receipt data for printing/download
// Provides formatted receipt payload with gym header, member info, breakdown & balance.
// Supports draft receipts (pending verification) and official verified receipts.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { Permission, requirePermission } from "@/lib/rbac";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { PaymentStatus } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    requirePermission(session.role, Permission.VIEW_RECEIPT);
    const { id } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        member: true,
        receivedBy: {
          select: { id: true, name: true, email: true },
        },
        verifiedBy: {
          select: { id: true, name: true, email: true },
        },
        membership: {
          include: {
            plan: true,
            payments: {
              orderBy: { paidAt: "asc" },
            },
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ success: false, error: "Payment not found" }, { status: 404 });
    }

    const membership = payment.membership;
    const allPayments = membership.payments;
    const finalAmount = membership.finalAmount.toNumber();
    // Only verified or paid payments count toward total confirmed paid
    const totalPaidSoFar = allPayments
      .filter((p) => p.paymentStatus === PaymentStatus.PAID || p.paymentStatus === PaymentStatus.VERIFIED)
      .reduce((sum, p) => sum + p.amount.toNumber(), 0);
    const balanceRemaining = Math.max(0, finalAmount - totalPaidSoFar);

    const isPending = payment.paymentStatus === PaymentStatus.PENDING_VERIFICATION;
    const isRejected = payment.paymentStatus === PaymentStatus.REJECTED;
    const isVerified = payment.paymentStatus === PaymentStatus.VERIFIED || payment.paymentStatus === PaymentStatus.PAID;

    const receipt = {
      gymDetails: {
        name: "BSF THE GYM",
        tagline: "Be Strong & Fit",
        address: "Gotri-Sevasi Road, Vadodara, Gujarat, India",
        phone: "+91 98765 43210",
        email: "bsfthegym@gmail.com",
      },
      receiptNumber: payment.receiptNumber,
      paymentDate: formatDateTime(payment.paidAt),
      paymentStatus: payment.paymentStatus,
      isPending,
      isRejected,
      isVerified,
      paymentProof: payment.paymentProof,
      transactionReference: payment.transactionReference,
      receivedBy: payment.receivedBy,
      verifiedBy: payment.verifiedBy,
      rejectionReason: payment.rejectionReason,
      member: {
        id: payment.member.id,
        fullName: payment.member.fullName,
        phoneNumber: payment.member.phoneNumber,
        whatsappNumber: payment.member.whatsappNumber,
        email: payment.member.email,
      },
      membership: {
        id: membership.id,
        membershipReference: membership.membershipReference,
        planName: membership.plan.name,
        durationMonths: membership.durationMonths,
        startDate: formatDate(membership.startDate),
        endDate: formatDate(membership.endDate),
        planPrice: formatCurrency(membership.priceAtPurchase.toNumber()),
        discount: formatCurrency(membership.discount.toNumber()),
        finalAmount: formatCurrency(finalAmount),
        membershipStatus: membership.membershipStatus,
        paymentStatus: membership.paymentStatus,
      },
      payment: {
        amountPaid: formatCurrency(payment.amount.toNumber()),
        amountNumeric: payment.amount.toNumber(),
        paymentMethod: payment.paymentMethod,
        notes: payment.notes,
      },
      summary: {
        totalPaidSoFar: formatCurrency(totalPaidSoFar),
        balanceRemaining: formatCurrency(balanceRemaining),
        balanceNumeric: balanceRemaining,
        isFullyPaid: balanceRemaining === 0,
      },
    };

    return NextResponse.json({ success: true, data: receipt });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (error.status === 403) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
