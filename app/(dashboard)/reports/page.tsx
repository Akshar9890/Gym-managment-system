// app/(dashboard)/reports/page.tsx — Reports server page with real data aggregation
import React from "react";
import { prisma } from "@/lib/prisma";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ReportsChartsClient } from "@/components/reports/ReportsChartsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const now = new Date();

  // 1. Fetch total counts
  const [totalMembers, allMembersWithLatest, totalPayments] = await Promise.all([
    prisma.member.count(),
    prisma.member.findMany({
      select: {
        id: true,
        memberships: {
          orderBy: { endDate: "desc" },
          take: 1,
          select: { membershipStatus: true },
        },
      },
    }),
    prisma.payment.findMany({
      where: { paymentStatus: { in: ["PAID", "PARTIAL"] } },
      select: { amount: true, paymentMethod: true, createdAt: true },
    }),
  ]);

  let activeMembers = 0;
  let expiredMembers = 0;
  for (const m of allMembersWithLatest) {
    const latest = m.memberships[0];
    if (!latest) continue;
    if (latest.membershipStatus === "ACTIVE" || latest.membershipStatus === "EXPIRING_SOON") {
      activeMembers++;
    } else if (latest.membershipStatus === "EXPIRED") {
      expiredMembers++;
    }
  }

  const totalRevenue = totalPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const renewalRate = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0;

  // 2. Last 6 months revenue
  const monthlyRevenue: Array<{ month: string; revenue: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    const label = format(d, "MMM yyyy");

    const monthSum = totalPayments
      .filter((p: any) => new Date(p.createdAt) >= start && new Date(p.createdAt) <= end)
      .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

    monthlyRevenue.push({ month: label, revenue: monthSum });
  }

  // 3. Payment methods mix
  const methodMap: Record<string, number> = {};
  totalPayments.forEach((p: any) => {
    methodMap[p.paymentMethod] = (methodMap[p.paymentMethod] || 0) + Number(p.amount);
  });
  const paymentMethods = Object.entries(methodMap).map(([name, value]) => ({
    name,
    value,
  }));

  // 4. Plan distribution
  const plans = await prisma.membershipPlan.findMany({
    include: {
      _count: {
        select: { memberships: { where: { membershipStatus: "ACTIVE" } } },
      },
    },
  });
  const planDistribution = plans.map((p: any) => ({
    name: p.name,
    count: p._count.memberships,
  }));

  // 5. WhatsApp Delivery stats
  const notifications = await prisma.notification.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  const notificationStats = notifications.map((n: any) => ({
    name: n.status === "SIMULATED" ? "Dev Simulated" : n.status,
    value: n._count.id,
  }));

  return (
    <ReportsChartsClient
      monthlyRevenue={monthlyRevenue}
      paymentMethods={paymentMethods}
      planDistribution={planDistribution}
      notificationStats={notificationStats}
      summary={{
        totalRevenue,
        activeCount: activeMembers,
        expiredCount: expiredMembers,
        renewalRate,
      }}
    />
  );
}
