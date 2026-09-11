// app/api/staff/performance/route.ts — Staff Performance & Comparison API
// All calculations in Asia/Kolkata timezone.
// Revenue is calculated from actual PAID Payment records received by the staff member.
// RBAC: STAFF sees only their own metrics; ADMIN/SUPER_ADMIN can see any/all staff.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { hasPermission, Permission } from "@/lib/rbac";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  parseISO,
  format,
} from "date-fns";

function getKolkataRange(
  period?: string | null,
  customStart?: string | null,
  customEnd?: string | null
): { start: Date; end: Date } {
  const now = new Date();
  // Get date in Asia/Kolkata
  const kolkataDateStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const baseDate = new Date(`${kolkataDateStr}T12:00:00.000Z`);

  if (period === "today") {
    return {
      start: new Date(`${kolkataDateStr}T00:00:00.000Z`),
      end: new Date(`${kolkataDateStr}T23:59:59.999Z`),
    };
  }

  if (period === "this_week") {
    const s = startOfWeek(baseDate, { weekStartsOn: 1 });
    const e = endOfWeek(baseDate, { weekStartsOn: 1 });
    const sStr = s.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const eStr = e.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    return {
      start: new Date(`${sStr}T00:00:00.000Z`),
      end: new Date(`${eStr}T23:59:59.999Z`),
    };
  }

  if (period === "this_year") {
    const s = startOfYear(baseDate);
    const e = endOfYear(baseDate);
    const sStr = s.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const eStr = e.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    return {
      start: new Date(`${sStr}T00:00:00.000Z`),
      end: new Date(`${eStr}T23:59:59.999Z`),
    };
  }

  if (period === "custom" && customStart && customEnd) {
    const s = parseISO(customStart);
    const e = parseISO(customEnd);
    const sStr = s.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const eStr = e.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    return {
      start: new Date(`${sStr}T00:00:00.000Z`),
      end: new Date(`${eStr}T23:59:59.999Z`),
    };
  }

  // Default: this_month
  const s = startOfMonth(baseDate);
  const e = endOfMonth(baseDate);
  const sStr = s.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const eStr = e.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return {
    start: new Date(`${sStr}T00:00:00.000Z`),
    end: new Date(`${eStr}T23:59:59.999Z`),
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);

    const period = searchParams.get("period") || "this_month";
    const customStart = searchParams.get("startDate");
    const customEnd = searchParams.get("endDate");
    let requestedStaffId = searchParams.get("staffId");

    const isStaff = session.role === "STAFF";
    const canViewAll = hasPermission(session.role, Permission.VIEW_STAFF_PERFORMANCE);

    // If caller is normal STAFF, strictly restrict to their own user ID
    if (isStaff || !canViewAll) {
      requestedStaffId = session.userId;
    }

    const { start: dateStart, end: dateEnd } = getKolkataRange(period, customStart, customEnd);

    // If a specific staff member is requested (or caller is staff):
    if (requestedStaffId) {
      const staffUser = await prisma.user.findUnique({
        where: { id: requestedStaffId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
        },
      });

      if (!staffUser) {
        return NextResponse.json({ success: false, error: "Staff member not found" }, { status: 404 });
      }

      // 1. Memberships created by this staff in range
      const memberships = await prisma.membership.findMany({
        where: {
          createdById: staffUser.id,
          createdAt: {
            gte: dateStart,
            lte: dateEnd,
          },
        },
        include: {
          plan: true,
          member: {
            select: { id: true, fullName: true, phoneNumber: true, createdAt: true },
          },
        },
      });

      // 2. Payments received by this staff in range (only successful/paid)
      const payments = await prisma.payment.findMany({
        where: {
          receivedById: staffUser.id,
          paymentStatus: { in: ["VERIFIED", "PAID"] },
          paidAt: {
            gte: dateStart,
            lte: dateEnd,
          },
        },
        include: {
          membership: {
            include: { plan: true },
          },
        },
      });

      const totalRevenue = payments.reduce((sum: number, p: any) => sum + p.amount.toNumber(), 0);
      const totalMemberships = memberships.length;

      // Renewals are memberships where notes indicate renewal, or the member already had an earlier membership
      const renewals = memberships.filter((m: any) =>
        Boolean(m.notes?.toLowerCase().includes("renewal"))
      ).length;

      // New members: members created whose first membership was created by this staff in the range
      const newMembers = memberships.filter(
        (m: any) =>
          m.member.createdAt >= dateStart &&
          m.member.createdAt <= dateEnd &&
          !m.notes?.toLowerCase().includes("renewal")
      ).length;

      const avgMembershipValue =
        totalMemberships > 0 ? Math.round(totalRevenue / totalMemberships) : 0;

      // Plan breakdown
      const planStats: Record<string, { count: number; revenue: number }> = {};
      memberships.forEach((m: any) => {
        const pName = m.plan.name;
        if (!planStats[pName]) planStats[pName] = { count: 0, revenue: 0 };
        planStats[pName].count++;
      });
      payments.forEach((p: any) => {
        const pName = p.membership.plan.name;
        if (!planStats[pName]) planStats[pName] = { count: 0, revenue: 0 };
        planStats[pName].revenue += p.amount.toNumber();
      });

      const membershipsByPlan = Object.entries(planStats).map(([name, stat]) => ({
        planName: name,
        count: stat.count,
        revenue: stat.revenue,
      }));

      return NextResponse.json({
        success: true,
        data: {
          staff: staffUser,
          period,
          dateRange: {
            start: dateStart.toISOString(),
            end: dateEnd.toISOString(),
          },
          summary: {
            newMembers,
            memberships: totalMemberships,
            renewals,
            revenue: totalRevenue,
            averageMembershipValue: avgMembershipValue,
          },
          membershipsByPlan,
        },
      });
    }

    // Admin overview & comparison across all staff
    const allStaff = await prisma.user.findMany({
      where: { role: "STAFF" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
      },
    });

    const comparisonList = await Promise.all(
      allStaff.map(async (staff: any) => {
        const memberships = await prisma.membership.findMany({
          where: {
            createdById: staff.id,
            createdAt: { gte: dateStart, lte: dateEnd },
          },
          include: {
            member: { select: { createdAt: true } },
          },
        });

        const payments = await prisma.payment.findMany({
          where: {
            receivedById: staff.id,
            paymentStatus: { in: ["VERIFIED", "PAID"] },
            paidAt: { gte: dateStart, lte: dateEnd },
          },
          select: { amount: true },
        });

        const revenue = payments.reduce((sum: number, p: any) => sum + p.amount.toNumber(), 0);
        const membershipsCount = memberships.length;
        const renewalsCount = memberships.filter((m: any) =>
          Boolean(m.notes?.toLowerCase().includes("renewal"))
        ).length;
        const newMembersCount = memberships.filter(
          (m: any) =>
            m.member.createdAt >= dateStart &&
            m.member.createdAt <= dateEnd &&
            !m.notes?.toLowerCase().includes("renewal")
        ).length;

        const averageValue =
          membershipsCount > 0 ? Math.round(revenue / membershipsCount) : 0;

        return {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          phone: staff.phone,
          isActive: staff.isActive,
          newMembers: newMembersCount,
          memberships: membershipsCount,
          renewals: renewalsCount,
          revenue,
          averageValue,
        };
      })
    );

    return NextResponse.json({
      success: true,
      period,
      dateRange: {
        start: dateStart.toISOString(),
        end: dateEnd.toISOString(),
      },
      comparison: comparisonList,
    });
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (error.status === 403) {
      return NextResponse.json(
        { success: false, error: "Forbidden: insufficient permissions" },
        { status: 403 }
      );
    }
    console.error("[GET /api/staff/performance]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to calculate performance" },
      { status: 500 }
    );
  }
}
