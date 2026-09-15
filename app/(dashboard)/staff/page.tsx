// app/(dashboard)/staff/page.tsx — Dedicated Staff Dashboard Page
// Server component rendering the Staff personal activity dashboard.

import React from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { StaffDashboardClient } from "@/components/staff/StaffDashboardClient";
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  addDays,
  differenceInCalendarDays,
} from "date-fns";

export const dynamic = "force-dynamic";

export default async function StaffDashboardPage() {
  const session = await getSession();

  if (!session.isLoggedIn || !session.userId) {
    redirect("/login");
  }

  // Fetch full user record
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    redirect("/login");
  }

  // Calculate dates in Asia/Kolkata
  const now = new Date();
  const kolkataDateStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const todayMidnight = new Date(`${kolkataDateStr}T00:00:00.000Z`);
  const todayEnd = new Date(`${kolkataDateStr}T23:59:59.999Z`);

  const monthStart = startOfMonth(todayMidnight);
  const monthEnd = endOfMonth(todayMidnight);

  // 1. Today's metrics
  const todayMemberships = await prisma.membership.findMany({
    where: {
      createdById: user.id,
      createdAt: { gte: todayMidnight, lte: todayEnd },
    },
    include: {
      member: { select: { createdAt: true } },
    },
  });

  const todayPayments = await prisma.payment.findMany({
    where: {
      receivedById: user.id,
      paymentStatus: { in: ["PAID", "VERIFIED"] },
      paidAt: { gte: todayMidnight, lte: todayEnd },
    },
    select: { amount: true },
  });

  const todayRevenue = todayPayments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
  const todayRenewals = todayMemberships.filter((m) =>
    Boolean(m.notes?.toLowerCase().includes("renewal"))
  ).length;
  const todayNewMembers = todayMemberships.filter(
    (m) =>
      m.member.createdAt >= todayMidnight &&
      !m.notes?.toLowerCase().includes("renewal")
  ).length;

  // 2. Month-to-date metrics
  const monthMemberships = await prisma.membership.findMany({
    where: {
      createdById: user.id,
      createdAt: { gte: monthStart, lte: monthEnd },
    },
    include: {
      member: { select: { createdAt: true } },
    },
  });

  const monthPayments = await prisma.payment.findMany({
    where: {
      receivedById: user.id,
      paymentStatus: { in: ["PAID", "VERIFIED"] },
      paidAt: { gte: monthStart, lte: monthEnd },
    },
    select: { amount: true },
  });

  const monthRevenue = monthPayments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
  const monthRenewals = monthMemberships.filter((m) =>
    Boolean(m.notes?.toLowerCase().includes("renewal"))
  ).length;
  const monthNewMembers = monthMemberships.filter(
    (m) =>
      m.member.createdAt >= monthStart &&
      !m.notes?.toLowerCase().includes("renewal")
  ).length;
  const monthAvgValue =
    monthMemberships.length > 0 ? Math.round(monthRevenue / monthMemberships.length) : 0;

  // 3. Expiring soon memberships (next 10 days) across all active gym members
  const tenDaysFromNow = addDays(todayMidnight, 10);
  const activeMembers = await prisma.member.findMany({
    where: { status: "ACTIVE" },
    include: {
      memberships: {
        orderBy: { startDate: "desc" },
        take: 2,
        include: { plan: true },
      },
    },
  });

  const expiringList: Array<{
    membershipId: string;
    memberId: string;
    memberName: string;
    phoneNumber: string;
    planName: string;
    endDate: string;
    daysRemaining: number;
  }> = [];

  for (const m of activeMembers) {
    if (m.memberships.length === 0) continue;
    const latest = m.memberships[0];

    // If latest membership is in advance and still has lots of time, not expiring soon
    if (latest.endDate > tenDaysFromNow) continue;

    // If latest is expiring within 10 days and active
    if (latest.endDate >= todayMidnight && latest.endDate <= tenDaysFromNow) {
      const days = differenceInCalendarDays(latest.endDate, todayMidnight);
      expiringList.push({
        membershipId: latest.id,
        memberId: m.id,
        memberName: m.fullName,
        phoneNumber: m.phoneNumber,
        planName: latest.plan.name,
        endDate: latest.endDate.toISOString(),
        daysRemaining: Math.max(0, days),
      });
    }
  }

  // 4. Recent activity by this staff member
  const recentCreatedMemberships = await prisma.membership.findMany({
    where: { createdById: user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      plan: true,
      member: { select: { fullName: true, phoneNumber: true } },
    },
  });

  const recentRecordedPayments = await prisma.payment.findMany({
    where: { receivedById: user.id },
    orderBy: { paidAt: "desc" },
    take: 5,
    include: {
      member: { select: { fullName: true, phoneNumber: true } },
    },
  });

  const combinedActivity = [
    ...recentCreatedMemberships.map((m) => ({
      id: `ms-${m.id}`,
      type: "MEMBERSHIP" as const,
      title: `${m.member.fullName} (${m.plan.name})`,
      subtitle: m.notes?.toLowerCase().includes("renewal") ? "Membership Renewal" : "New Membership",
      amount: m.finalAmount.toNumber(),
      timestamp: m.createdAt.toISOString(),
      status: m.membershipStatus,
    })),
    ...recentRecordedPayments.map((p) => ({
      id: `pay-${p.id}`,
      type: "PAYMENT" as const,
      title: `Payment: ${p.member.fullName}`,
      subtitle: `Receipt ${p.receiptNumber} (${p.paymentMethod})`,
      amount: p.amount.toNumber(),
      timestamp: p.paidAt.toISOString(),
      status: p.paymentStatus,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

  return (
    <StaffDashboardClient
      staff={user}
      todayMetrics={{
        newMembers: todayNewMembers,
        membershipsCreated: todayMemberships.length,
        renewals: todayRenewals,
        revenue: todayRevenue,
      }}
      monthMetrics={{
        newMembers: monthNewMembers,
        membershipsCreated: monthMemberships.length,
        renewals: monthRenewals,
        revenue: monthRevenue,
        averageValue: monthAvgValue,
      }}
      expiringMembers={expiringList}
      recentActivity={combinedActivity}
    />
  );
}
