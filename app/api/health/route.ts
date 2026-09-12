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

  try {
    const users = await prisma.user.count();
    userCount = users;
    dbStatus = "connected";
  } catch (err) {
    dbStatus = "failed";
    dbError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    status: dbStatus === "connected" ? "healthy" : "degraded",
    db: dbStatus,
  });
}
