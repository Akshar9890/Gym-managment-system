// app/(dashboard)/members/page.tsx — Members directory server page
import React from "react";
import { prisma } from "@/lib/prisma";
import {
  MembersTableClient,
  MemberListItem,
} from "@/components/members/MembersTableClient";

export const dynamic = "force-dynamic";

interface MembersPageProps {
  searchParams?: Promise<{
    action?: string;
    status?: string;
    filter?: string;
  }>;
}

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const initialAction = resolvedParams.action;

  let initialFilterStatus = "ALL";
  const f = (resolvedParams.filter || resolvedParams.status || "").toUpperCase();
  if (f === "ACTIVE") {
    initialFilterStatus = "ACTIVE";
  } else if (f === "EXPIRING" || f === "EXPIRING_SOON") {
    initialFilterStatus = "EXPIRING_SOON";
  } else if (f === "EXPIRED") {
    initialFilterStatus = "EXPIRED";
  } else if (f === "DUE" || f === "DUE_BALANCE" || f === "PARTIAL" || f === "PENDING") {
    initialFilterStatus = "DUE_BALANCE";
  } else if (f === "PAUSED") {
    initialFilterStatus = "PAUSED";
  }

  const members = await prisma.member.findMany({
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
      memberships: {
        include: {
          plan: true,
          createdBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { endDate: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const memberItems: MemberListItem[] = members.map((m: any) => {
    const activeOrLatest = m.memberships[0] || null;

    return {
      id: m.id,
      fullName: m.fullName,
      profilePhoto: m.profilePhoto || null,
      phoneNumber: m.phoneNumber,
      whatsappNumber: m.whatsappNumber || m.phoneNumber,
      whatsappVerified: m.whatsappVerified,
      status: m.status,
      joinDate: m.joinDate.toISOString(),
      createdBy: m.createdBy || m.memberships[0]?.createdBy || null,
      currentMembership: activeOrLatest
        ? {
            id: activeOrLatest.id,
            planName: activeOrLatest.plan.name,
            startDate: activeOrLatest.startDate.toISOString(),
            endDate: activeOrLatest.endDate.toISOString(),
            membershipStatus: activeOrLatest.membershipStatus,
            paymentStatus: activeOrLatest.paymentStatus,
          }
        : null,
    };
  });

  return (
    <MembersTableClient
      initialMembers={memberItems}
      initialAction={initialAction}
      initialFilterStatus={initialFilterStatus}
    />
  );
}
