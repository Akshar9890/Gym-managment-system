// app/api/auth/passkey/list/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();

    const passkeys = await prisma.passkey.findMany({
      where: { userId: session.userId },
      select: {
        id: true,
        name: true,
        deviceType: true,
        backedUp: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ passkeys });
  } catch (err: any) {
    console.error("Passkey list error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to list passkeys" },
      { status: 500 }
    );
  }
}
