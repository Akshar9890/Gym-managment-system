// app/(dashboard)/payments/page.tsx — Payments list server page
import React from "react";
import { prisma } from "@/lib/prisma";
import {
  PaymentsListClient,
  PaymentListItem,
} from "@/components/payments/PaymentsListClient";

export const dynamic = "force-dynamic";

interface PaymentsPageProps {
  searchParams?: Promise<{
    status?: string;
    filter?: string;
  }>;
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const initialStatusFilter = resolvedParams.status || resolvedParams.filter || "ALL";
  const payments = await prisma.payment.findMany({
    include: {
      member: true,
      membership: {
        include: { plan: true },
      },
      receivedBy: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const paymentItems: PaymentListItem[] = payments.map((p: any) => ({
    id: p.id,
    receiptNumber: p.receiptNumber,
    amount: Number(p.amount),
    paymentMethod: p.paymentMethod,
    paymentStatus: p.paymentStatus,
    createdAt: p.createdAt.toISOString(),
    notes: p.notes,
    paymentProof: p.paymentProof,
    transactionReference: p.transactionReference,
    member: {
      id: p.member.id,
      fullName: p.member.fullName,
      phoneNumber: p.member.phoneNumber,
      whatsappNumber: p.member.whatsappNumber,
      email: p.member.email,
    },
    membership: {
      id: p.membership.id,
      membershipReference: p.membership.membershipReference,
      planName: p.membership.plan.name,
      startDate: p.membership.startDate.toISOString(),
      endDate: p.membership.endDate.toISOString(),
      priceAtPurchase: Number(p.membership.priceAtPurchase),
      discount: Number(p.membership.discount),
      finalAmount: Number(p.membership.finalAmount),
      paymentStatus: p.membership.paymentStatus,
    },
    receivedBy: p.receivedBy
      ? {
          name: p.receivedBy.name,
          role: p.receivedBy.role,
        }
      : null,
  }));

  return (
    <PaymentsListClient
      initialPayments={paymentItems}
      initialStatusFilter={initialStatusFilter}
    />
  );
}
