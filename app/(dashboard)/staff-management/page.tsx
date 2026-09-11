// app/(dashboard)/staff-management/page.tsx — Admin Staff Management Page
// Accessible only to SUPER_ADMIN and ADMIN.

import React from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasPermission, Permission } from "@/lib/rbac";
import { StaffManagementClient } from "@/components/staff/StaffManagementClient";

export const dynamic = "force-dynamic";

export default async function StaffManagementPage() {
  const session = await getSession();

  if (!session.isLoggedIn || !session.userId) {
    redirect("/login");
  }

  // Strictly enforce server-side RBAC: STAFF cannot access this page
  if (!hasPermission(session.role, Permission.MANAGE_STAFF)) {
    redirect("/staff");
  }

  const staffMembers = await prisma.user.findMany({
    where: {
      role: "STAFF",
    },
    orderBy: [
      { isActive: "desc" },
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      membershipsCreated: {
        select: {
          id: true,
          durationMonths: true,
          finalAmount: true,
          notes: true,
        },
      },
      paymentsReceived: {
        where: {
          paymentStatus: { in: ["VERIFIED", "PAID"] },
        },
        select: {
          id: true,
          amount: true,
        },
      },
    },
  });

  let overallTotalRevenue = 0;
  let overallTotalMemberships = 0;
  let activeStaffCount = 0;
  let inactiveStaffCount = 0;

  const staffList = staffMembers.map((s: any) => {
    if (s.isActive) activeStaffCount++;
    else inactiveStaffCount++;

    const membershipsCount = s.membershipsCreated.length;
    overallTotalMemberships += membershipsCount;

    const renewalsCount = s.membershipsCreated.filter((m: any) =>
      Boolean(m.notes?.toLowerCase().includes("renewal"))
    ).length;

    const revenueGenerated = s.paymentsReceived.reduce(
      (sum: number, p: any) => sum + p.amount.toNumber(),
      0
    );
    overallTotalRevenue += revenueGenerated;

    return {
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      role: s.role,
      isActive: s.isActive,
      lastLoginAt: s.lastLoginAt ? s.lastLoginAt.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
      membershipsCount,
      renewalsCount,
      revenueGenerated,
    };
  });

  return (
    <StaffManagementClient
      initialStaff={staffList}
      summary={{
        totalStaff: staffMembers.length,
        activeStaff: activeStaffCount,
        inactiveStaff: inactiveStaffCount,
        totalRevenue: overallTotalRevenue,
        totalMemberships: overallTotalMemberships,
      }}
    />
  );
}
