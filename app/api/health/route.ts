import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const envCheck = {
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    databaseHost: process.env.DATABASE_URL
      ? process.env.DATABASE_URL.split("@")[1]?.split("/")[0] ?? "unknown"
      : "missing",
    hasSessionSecret: Boolean(process.env.SESSION_SECRET),
    sessionSecretLength: process.env.SESSION_SECRET?.length ?? 0,
    hasAppUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    nodeEnv: process.env.NODE_ENV,
  };

  let dbStatus = "unknown";
  let dbError = null;
  let userCount = -1;
  let memberCount = -1;
  let membersError = null;
  let dashboardQueriesOk = false;
  let dashboardError = null;

  let usersList: any[] = [];
  let recentAuditLogs: any[] = [];
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, isActive: true, updatedAt: true },
    });
    usersList = users;
    userCount = users.length;
    recentAuditLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { action: true, entityType: true, createdAt: true },
    });
    dbStatus = "connected";
  } catch (err) {
    dbStatus = "failed";
    dbError = err instanceof Error ? err.message : String(err);
  }

  let adminPasswordIsDefault: boolean | null = null;
  try {
    const adminUser = await prisma.user.findFirst({
      where: { email: "admin@gmail.com" },
      select: { passwordHash: true },
    });
    if (adminUser) {
      const bcrypt = (await import("bcryptjs")).default;
      adminPasswordIsDefault = await bcrypt.compare("BSFAdmin@2024!", adminUser.passwordHash);
    }
  } catch (err) {
    console.error("Check default password error:", err);
  }

  try {
    memberCount = await prisma.member.count();
  } catch (err) {
    membersError = err instanceof Error ? err.message : String(err);
  }

  try {
    const m = await prisma.member.findMany({
      include: {
        createdBy: { select: { id: true, name: true } },
        memberships: {
          include: {
            plan: true,
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { endDate: "desc" },
          take: 1,
        },
      },
      take: 5,
    });
    dashboardQueriesOk = true;
  } catch (err) {
    dashboardError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    status: dbStatus === "connected" ? "healthy" : "degraded",
    db: dbStatus,
    userCount,
    users: usersList,
    adminPasswordIsDefault,
    recentAuditLogs,
    memberCount,
    dbError,
    membersError,
    dashboardQueriesOk,
    dashboardError,
    envCheck: {
      hasDatabaseUrl: envCheck.hasDatabaseUrl,
      databaseHost: envCheck.databaseHost,
      nodeEnv: envCheck.nodeEnv,
    },
  });
}
