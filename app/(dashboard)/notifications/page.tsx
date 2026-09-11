// app/(dashboard)/notifications/page.tsx — Notification Center Server Page
import React from "react";
import { prisma } from "@/lib/prisma";
import {
  NotificationsClient,
  NotificationItem,
} from "@/components/notifications/NotificationsClient";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const notifications = await prisma.notification.findMany({
    include: {
      member: true,
      membership: {
        include: { plan: true },
      },
    },
    orderBy: { sentAt: "desc" },
    take: 50,
  });

  const notificationItems: NotificationItem[] = notifications.map((n: any) => ({
    id: n.id,
    type: n.type,
    channel: n.channel,
    status: n.status,
    sentAt: (n.sentAt || new Date()).toISOString(),
    triggerDate: n.triggerDate instanceof Date ? n.triggerDate.toISOString().split("T")[0] : String(n.triggerDate),
    metadata: n.metadata,
    member: {
      id: n.member.id,
      memberId: n.member.memberId,
      fullName: n.member.fullName,
      whatsappNumber: n.member.whatsappNumber || n.member.phoneNumber,
    },
    membership: n.membership
      ? {
          id: n.membership.id,
          planName: n.membership.plan.name,
          endDate: n.membership.endDate.toISOString(),
          membershipStatus: n.membership.membershipStatus,
        }
      : null,
  }));

  return <NotificationsClient notifications={notificationItems} />;
}
