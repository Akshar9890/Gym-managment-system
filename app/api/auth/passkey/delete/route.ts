// app/api/auth/passkey/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { passkeyId } = await req.json();

    if (!passkeyId) {
      return NextResponse.json(
        { error: "Passkey ID is required" },
        { status: 400 }
      );
    }

    const passkey = await prisma.passkey.findUnique({
      where: { id: passkeyId },
    });

    if (!passkey || passkey.userId !== session.userId) {
      return NextResponse.json(
        { error: "Passkey not found or unauthorized" },
        { status: 404 }
      );
    }

    await prisma.passkey.delete({
      where: { id: passkeyId },
    });

    return NextResponse.json({ success: true, message: "Passkey removed" });
  } catch (err: any) {
    console.error("Passkey delete error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to remove passkey" },
      { status: 500 }
    );
  }
}
