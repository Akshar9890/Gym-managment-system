// app/api/auth/passkey/login-options/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import {
  getWebAuthnConfig,
  signChallenge,
  WEBAUTHN_CHALLENGE_COOKIE,
} from "@/lib/auth/passkey";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let email: string | undefined;
    try {
      const body = await req.json();
      if (body && typeof body.email === "string" && body.email.trim()) {
        email = body.email.trim().toLowerCase();
      }
    } catch {
      // Body is optional for 1-tap discoverable credentials
    }

    const { rpID } = getWebAuthnConfig(req);

    let allowCredentials: Array<{ id: string; transports?: any }> | undefined =
      undefined;

    if (email) {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { passkeys: true },
      });

      if (user && user.passkeys.length > 0) {
        allowCredentials = user.passkeys.map((p) => ({
          id: p.credentialId,
          transports: p.transports ? (p.transports.split(",") as any) : undefined,
        }));
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
      allowCredentials,
    });

    const signed = signChallenge(options.challenge, email || "");

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
    console.error("Passkey login-options error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate login options" },
      { status: 500 }
    );
  }
}
