// app/api/auth/me/route.ts — Current session info (server-validated, never trusts client)

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Return only non-sensitive session data
    return NextResponse.json({
      id: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
    });
  } catch (error) {
    console.error("[GET /api/auth/me]", error);
    return NextResponse.json({ error: "Session error" }, { status: 500 });
  }
}
