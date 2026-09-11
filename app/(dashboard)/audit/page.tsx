// app/(dashboard)/audit/page.tsx — Audit Logs server page
import React from "react";
import { prisma } from "@/lib/prisma";
import { AuditLogsClient, AuditLogItem } from "@/components/audit/AuditLogsClient";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  const logs = await prisma.auditLog.findMany({
    include: {
      user: {
        select: { name: true, email: true, role: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const auditItems: AuditLogItem[] = logs.map((l: any) => ({
    id: l.id,
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    oldValues: l.oldValues,
    newValues: l.newValues,
    createdAt: l.createdAt.toISOString(),
    user: l.user,
  }));

  return <AuditLogsClient logs={auditItems} />;
}
