// app/api/auth/logout/route.ts

import { NextResponse } from "next/server";
import { getSession, requireSession } from "@/lib/auth/session";
import { writeAuditLog, AuditAction } from "@/lib/auth/audit";

export async function POST() {
  try {
    const session = await getSession();
    const userId = session.userId;

    if (userId) {
      await writeAuditLog({
        userId,
        action: AuditAction.USER_LOGOUT,
        entityType: "User",
        entityId: userId,
      });
    }

    session.destroy();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/auth/logout]", error);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
