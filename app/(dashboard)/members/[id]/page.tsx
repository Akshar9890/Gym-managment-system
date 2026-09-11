// app/(dashboard)/members/[id]/page.tsx — Member Profile Server Page
// Strictly uses Name, Phone, WhatsApp, Email, and Reference Numbers. No Member ID.

import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MemberProfileClient } from "@/components/members/MemberProfileClient";

interface MemberPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function MemberPage({ params }: MemberPageProps) {
  const { id } = await params;

  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, role: true },
      },
      memberships: {
        include: {
          plan: true,
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
          payments: {
            include: {
              receivedBy: {
                select: { id: true, name: true, email: true, role: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { endDate: "desc" },
      },
      notifications: {
        orderBy: { sentAt: "desc" },
      },
    },
  });

  if (!member) {
    notFound();
  }

  const serializedMember = {
    id: member.id,
    fullName: member.fullName,
    profilePhoto: member.profilePhoto || null,
    phoneNumber: member.phoneNumber,
    whatsappNumber: member.whatsappNumber || member.phoneNumber,
    whatsappVerified: member.whatsappVerified,
    email: member.email,
    gender: member.gender || "MALE",
    dateOfBirth: member.dateOfBirth?.toISOString() || null,
    address: member.address,
    emergencyContactName: member.emergencyContactName,
    emergencyContactPhone: member.emergencyContactPhone,
    joinDate: member.joinDate.toISOString(),
    notes: member.notes,
    status: member.status,
    createdBy: member.createdBy || member.memberships[0]?.createdBy || null,
    memberships: member.memberships.map((m: any) => ({
      id: m.id,
      membershipReference: m.membershipReference,
      startDate: m.startDate.toISOString(),
      endDate: m.endDate.toISOString(),
      priceAtPurchase: Number(m.priceAtPurchase),
      discount: Number(m.discount),
      finalAmount: Number(m.finalAmount),
      membershipStatus: m.membershipStatus,
      paymentStatus: m.paymentStatus,
      createdBy: m.createdBy
        ? { id: m.createdBy.id, name: m.createdBy.name, email: m.createdBy.email, role: m.createdBy.role }
        : null,
      plan: {
        id: m.plan.id,
        name: m.plan.name,
        durationMonths: m.plan.durationMonths,
        price: Number(m.plan.price),
      },
      payments: m.payments.map((p: any) => ({
        id: p.id,
        receiptNumber: p.receiptNumber,
        amount: Number(p.amount),
        paymentMethod: p.paymentMethod,
        paymentStatus: p.paymentStatus,
        paymentProof: p.paymentProof,
        transactionReference: p.transactionReference,
        createdAt: p.createdAt.toISOString(),
        notes: p.notes,
        receivedBy: p.receivedBy
          ? { id: p.receivedBy.id, name: p.receivedBy.name, email: p.receivedBy.email, role: p.receivedBy.role }
          : null,
      })),
    })),
    notifications: member.notifications.map((n: any) => ({
      id: n.id,
      type: n.type,
      channel: n.channel,
      status: n.status,
      sentAt: (n.sentAt || new Date()).toISOString(),
      triggerDate: n.triggerDate instanceof Date ? n.triggerDate.toISOString().split("T")[0] : String(n.triggerDate),
      metadata: n.metadata,
    })),
  };

  return <MemberProfileClient member={serializedMember} />;
}
