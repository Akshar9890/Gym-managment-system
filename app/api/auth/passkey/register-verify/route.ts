// app/api/auth/passkey/register-verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import {
  getWebAuthnConfig,
  verifyChallenge,
  WEBAUTHN_CHALLENGE_COOKIE,
} from "@/lib/auth/passkey";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const cookieHeader = req.cookies.get(WEBAUTHN_CHALLENGE_COOKIE)?.value;

    if (!cookieHeader) {
      return NextResponse.json(
        { error: "Registration session expired. Please try again." },
        { status: 400 }
      );
    }

    const verified = verifyChallenge(cookieHeader);
    if (!verified || verified.extraData !== session.userId) {
      return NextResponse.json(
        { error: "Invalid challenge or user mismatch. Please try again." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { registrationResponse, deviceName } = body;

    if (!registrationResponse) {
      return NextResponse.json(
        { error: "Missing registration payload." },
        { status: 400 }
      );
    }

    const { rpID, origin } = getWebAuthnConfig(req);

    const verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge: verified.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: "Verification failed. Could not verify biometric key." },
        { status: 400 }
      );
    }

    const {
      credential,
      credentialDeviceType,
      credentialBackedUp,
    } = verification.registrationInfo;

    // Save passkey in database
    await prisma.passkey.create({
      data: {
        userId: session.userId,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey),
        counter: BigInt(credential.counter),
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        transports: credential.transports?.join(","),
        name: deviceName || "Biometric Passkey",
        lastUsedAt: new Date(),
      },
    });

    const res = NextResponse.json({
      success: true,
      message: "Passkey registered successfully",
    });

    res.cookies.delete(WEBAUTHN_CHALLENGE_COOKIE);
    return res;
  } catch (err: any) {
    console.error("Passkey register-verify error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to verify and save passkey" },
      { status: 500 }
    );
  }
}
