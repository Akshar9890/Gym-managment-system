// app/(dashboard)/dashboard/page.tsx — Admin Dashboard per PRD.md & DESIGN.md
import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { format, startOfMonth, differenceInCalendarDays } from "date-fns";
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  IndianRupee,
  UserPlus,
  ArrowRight,
  ShieldAlert,
  CreditCard,
  Sparkles,
} from "lucide-react";
import {
  UpcomingExpirationsTable,
  ExpirationRow,
} from "@/components/dashboard/UpcomingExpirationsTable";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const today = new Date();
  const monthStart = startOfMonth(today);

  // 1. Fetch KPI metrics concurrently
  const [
    totalMembers,
    allMembersWithLatest,
    newMembersThisMonth,
    revenueMtd,
    pendingPaymentsCount,
    upcomingMemberships,
  ] = await Promise.all([
    // Total members
    prisma.member.count(),

    // Members with latest membership to derive active, expiring, and expired member counts
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

    // New members joined this month
    prisma.member.count({
      where: { createdAt: { gte: monthStart } },
    }),

    // Revenue MTD
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        createdAt: { gte: monthStart },
        paymentStatus: { in: ["PAID", "PARTIAL"] },
      },
    }),

    // Pending/Partial payments count
    prisma.membership.count({
      where: { paymentStatus: { in: ["PARTIAL", "PENDING"] } },
    }),

    // Upcoming expirations (next 10 days, or expiring soon)
    prisma.membership.findMany({
      where: {
        membershipStatus: { in: ["ACTIVE", "EXPIRING_SOON"] },
      },
      include: {
        member: {
          include: {
            memberships: {
              where: { membershipStatus: "ACTIVE" },
            },
          },
        },
        plan: true,
      },
      orderBy: { endDate: "asc" },
      take: 20,
    }),
  ]);

  let activeMemberships = 0;
  let expiringMemberships = 0;
  let expiredMemberships = 0;

  for (const m of allMembersWithLatest) {
    const latest = m.memberships[0];
    if (!latest) continue;
    if (latest.membershipStatus === "ACTIVE") {
      activeMemberships++;
    } else if (latest.membershipStatus === "EXPIRING_SOON") {
      expiringMemberships++;
    } else if (latest.membershipStatus === "EXPIRED") {
      expiredMemberships++;
    }
  }

  const formattedMtdRevenue = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(revenueMtd._sum.amount || 0));

  // Transform upcoming expirations (exclude memberships where member has already paid advance renewal)
  const expirationRows: ExpirationRow[] = upcomingMemberships
    .filter((m: any) => {
      const hasSubsequentRenewal = m.member?.memberships?.some(
        (other: any) => other.id !== m.id && new Date(other.startDate) >= new Date(m.endDate)
      );
      if (hasSubsequentRenewal) return false;
      const daysRemaining = differenceInCalendarDays(new Date(m.endDate), today);
      return daysRemaining >= 0 && daysRemaining <= 10;
    })
    .slice(0, 10)
    .map((m: any) => {
      const daysRemaining = differenceInCalendarDays(new Date(m.endDate), today);
      return {
        membershipId: m.id,
        memberId: m.member.id,
        memberName: m.member.fullName,
        phoneNumber: m.member.phoneNumber,
        whatsappNumber: m.member.whatsappNumber || m.member.phoneNumber,
        whatsappVerified: m.member.whatsappVerified,
        planName: m.plan.name,
        endDate: m.endDate.toISOString(),
        membershipStatus: m.membershipStatus,
        daysRemaining,
      };
    });

  return (
    <div className="space-y-8">
      {/* Page Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white tracking-tight">
            Club Overview
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time status of memberships, upcoming expirations, and renewals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/members?action=create"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold shadow-lg shadow-amber-500/10 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member</span>
          </Link>
          <Link
            href="/payments"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#17191E] hover:bg-[#1E2128] text-white border border-[#252830] text-xs font-medium transition-colors"
          >
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span>Record Payment</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Members */}
        <Link
          href="/members"
          className="bg-[#17191E] border border-[#252830] hover:border-amber-500/40 hover:bg-[#1C1F26] rounded-xl p-4 flex flex-col justify-between transition-all group cursor-pointer shadow-md"
        >
          <div className="flex items-center justify-between text-gray-400 group-hover:text-gray-300">
            <span className="text-xs font-medium">Total Members</span>
            <Users className="w-4 h-4 text-gray-500 group-hover:text-amber-400 transition-colors" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-display text-white tabular-nums">
              {totalMembers}
            </span>
            <span className="text-[11px] text-emerald-400 block mt-0.5">
              +{newMembersThisMonth} this month
            </span>
          </div>
        </Link>

        {/* Active Members */}
        <Link
          href="/members?filter=active"
          className="bg-[#17191E] border border-[#252830] hover:border-emerald-500/50 hover:bg-[#1C1F26] rounded-xl p-4 flex flex-col justify-between transition-all group cursor-pointer shadow-md"
        >
          <div className="flex items-center justify-between text-gray-400 group-hover:text-gray-300">
            <span className="text-xs font-medium">Active</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-display text-emerald-400 tabular-nums">
              {activeMemberships}
            </span>
            <span className="text-[11px] text-gray-500 group-hover:text-gray-400 block mt-0.5">
              Valid membership
            </span>
          </div>
        </Link>

        {/* Expiring Soon */}
        <Link
          href="/members?filter=expiring"
          className="bg-[#17191E] border border-[#252830] hover:border-amber-500/50 hover:bg-[#1C1F26] rounded-xl p-4 flex flex-col justify-between transition-all group cursor-pointer shadow-md"
        >
          <div className="flex items-center justify-between text-gray-400 group-hover:text-gray-300">
            <span className="text-xs font-medium">Expiring Soon</span>
            <Clock className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-display text-amber-400 tabular-nums">
              {expiringMemberships}
            </span>
            <span className="text-[11px] text-amber-400/80 block mt-0.5">
              Next 10 days
            </span>
          </div>
        </Link>

        {/* Expired */}
        <Link
          href="/members?filter=expired"
          className="bg-[#17191E] border border-[#252830] hover:border-red-500/50 hover:bg-[#1C1F26] rounded-xl p-4 flex flex-col justify-between transition-all group cursor-pointer shadow-md"
        >
          <div className="flex items-center justify-between text-gray-400 group-hover:text-gray-300">
            <span className="text-xs font-medium">Expired</span>
            <AlertTriangle className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-display text-red-400 tabular-nums">
              {expiredMemberships}
            </span>
            <span className="text-[11px] text-red-400/80 block mt-0.5">
              Action required
            </span>
          </div>
        </Link>

        {/* Pending Payments / Due Balances */}
        <Link
          href="/members?filter=due"
          className="bg-[#17191E] border border-[#252830] hover:border-orange-500/50 hover:bg-[#1C1F26] rounded-xl p-4 flex flex-col justify-between transition-all group cursor-pointer shadow-md"
        >
          <div className="flex items-center justify-between text-gray-400 group-hover:text-gray-300">
            <span className="text-xs font-medium">Due Balances</span>
            <ShieldAlert className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-display text-orange-400 tabular-nums">
              {pendingPaymentsCount}
            </span>
            <span className="text-[11px] text-gray-500 group-hover:text-gray-400 block mt-0.5">
              Partial / pending
            </span>
          </div>
        </Link>

        {/* Revenue MTD */}
        <Link
          href="/reports"
          className="bg-[#17191E] border border-[#252830] hover:border-amber-500/40 hover:bg-[#1C1F26] rounded-xl p-4 flex flex-col justify-between transition-all group cursor-pointer shadow-md"
        >
          <div className="flex items-center justify-between text-gray-400 group-hover:text-gray-300">
            <span className="text-xs font-medium">MTD Revenue</span>
            <IndianRupee className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold font-display text-white tabular-nums">
              {formattedMtdRevenue}
            </span>
            <span className="text-[11px] text-gray-500 group-hover:text-gray-400 block mt-0.5">
              {format(today, "MMMM yyyy")}
            </span>
          </div>
        </Link>
      </div>

      {/* "Today's Attention" Hero Section per DESIGN.md & PRD.md */}
      <div className="bg-gradient-to-r from-[#17191E] to-[#1F232B] border border-amber-500/20 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-amber-500/5 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Today&apos;s Attention</span>
            </div>
            <h2 className="text-lg font-bold text-white">
              {expiringMemberships + expiredMemberships > 0
                ? `${expiringMemberships + expiredMemberships} Members Require Renewal Attention`
                : "All Memberships Are In Good Standing"}
            </h2>
            <p className="text-xs text-gray-400 max-w-xl">
              Track upcoming expirations below and send personalized renewal reminders directly to members on WhatsApp with 1-click.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs shrink-0">
            <Link
              href="/members?filter=expiring"
              className="text-center px-4 py-2 rounded-lg bg-[#111316]/80 border border-[#252830] hover:border-amber-500/50 hover:bg-[#1A1D24] transition-all cursor-pointer block"
            >
              <div className="text-lg font-bold text-amber-400 font-mono">
                {expiringMemberships}
              </div>
              <div className="text-gray-400 text-[11px]">Expiring &le; 10d</div>
            </Link>
            <Link
              href="/members?filter=expired"
              className="text-center px-4 py-2 rounded-lg bg-[#111316]/80 border border-[#252830] hover:border-red-500/50 hover:bg-[#1A1D24] transition-all cursor-pointer block"
            >
              <div className="text-lg font-bold text-red-400 font-mono">
                {expiredMemberships}
              </div>
              <div className="text-gray-400 text-[11px]">Expired</div>
            </Link>
            <Link
              href="/members?filter=due"
              className="text-center px-4 py-2 rounded-lg bg-[#111316]/80 border border-[#252830] hover:border-orange-500/50 hover:bg-[#1A1D24] transition-all cursor-pointer block"
            >
              <div className="text-lg font-bold text-orange-400 font-mono">
                {pendingPaymentsCount}
              </div>
              <div className="text-gray-400 text-[11px]">Due Balances</div>
            </Link>
          </div>
        </div>
      </div>

      {/* Upcoming Expirations Table with 1-Click WhatsApp reminder */}
      <UpcomingExpirationsTable initialRows={expirationRows} />
    </div>
  );
}
