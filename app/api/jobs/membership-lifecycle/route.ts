// app/api/jobs/membership-lifecycle/route.ts — Secured job trigger endpoint
// Can be called by:
// 1. External scheduler / cron container via Authorization: Bearer <JOB_SECRET>
// 2. Authenticated ADMIN / SUPER_ADMIN from admin UI via session cookie

import { NextRequest, NextResponse } from "next/server";
import { runMembershipLifecycleJob } from "@/lib/jobs/membership-lifecycle-job";
import { getSession } from "@/lib/auth/session";
import { isAtLeastRole } from "@/lib/rbac";
import { Role } from "@prisma/client";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const expectedToken = process.env.JOB_SECRET;

  let isAuthorized = false;

  // 1. Check Bearer token
  if (expectedToken && authHeader === `Bearer ${expectedToken}`) {
    isAuthorized = true;
  }

  // 2. Check Admin session fallback
  if (!isAuthorized) {
    try {
      const session = await getSession();
      if (session.isLoggedIn && isAtLeastRole(session.role, Role.ADMIN)) {
        isAuthorized = true;
      }
    } catch {
      // Ignore session errors
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runMembershipLifecycleJob();

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[Job] membership-lifecycle-job failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Job execution failed",
        message: error.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed. Use POST to trigger job." }, { status: 405 });
}
