// app/api/auth/passkey/register-options/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import {
  getWebAuthnConfig,
  signChallenge,
  WEBAUTHN_CHALLENGE_COOKIE,
} from "@/lib/auth/passkey";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { passkeys: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { rpName, rpID } = getWebAuthnConfig(req);

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new Uint8Array(Buffer.from(user.id)),
      userName: user.email,
      userDisplayName: user.name || user.email,
      attestationType: "none",
      excludeCredentials: user.passkeys.map((p) => ({
        id: p.credentialId,
        transports: p.transports ? (p.transports.split(",") as any) : undefined,
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    const signed = signChallenge(options.challenge, user.id);

    const res = NextResponse.json(options);
    res.cookies.set(WEBAUTHN_CHALLENGE_COOKIE, signed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 300, // 5 minutes
      path: "/",
    });

    return res;
  } catch (err: any) {
    console.error("Passkey register-options error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate passkey options" },
      { status: 500 }
    );
  }
}
