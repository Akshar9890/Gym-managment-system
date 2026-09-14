// app/api/auth/passkey/login-verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { writeAuditLog, AuditAction } from "@/lib/auth/audit";
import {
  getWebAuthnConfig,
  verifyChallenge,
  WEBAUTHN_CHALLENGE_COOKIE,
} from "@/lib/auth/passkey";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.cookies.get(WEBAUTHN_CHALLENGE_COOKIE)?.value;

    if (!cookieHeader) {
      return NextResponse.json(
        { error: "Passkey session expired. Please tap sign in again." },
        { status: 400 }
      );
    }

    const verifiedChallenge = verifyChallenge(cookieHeader);
    if (!verifiedChallenge) {
      return NextResponse.json(
        { error: "Invalid challenge or signature. Please try again." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { authenticationResponse } = body;

    if (!authenticationResponse || !authenticationResponse.id) {
      return NextResponse.json(
        { error: "Missing authentication payload." },
        { status: 400 }
      );
    }

    // Find passkey by credential ID
    const passkey = await prisma.passkey.findUnique({
      where: { credentialId: authenticationResponse.id },
      include: { user: true },
    });

    if (!passkey || !passkey.user || !passkey.user.isActive) {
      return NextResponse.json(
        { error: "Passkey not found or associated account is inactive." },
        { status: 401 }
      );
    }

    const { rpID, origin } = getWebAuthnConfig(req);

    const verification = await verifyAuthenticationResponse({
      response: authenticationResponse,
      expectedChallenge: verifiedChallenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: Number(passkey.counter),
        transports: passkey.transports
          ? (passkey.transports.split(",") as any)
          : undefined,
      },
    });

    if (!verification.verified) {
      return NextResponse.json(
        { error: "Passkey verification failed. Biometric authentication rejected." },
        { status: 401 }
      );
    }

    // Update counter and lastUsedAt
    await prisma.passkey.update({
      where: { id: passkey.id },
      data: {
        counter: BigInt(verification.authenticationInfo.newCounter),
        lastUsedAt: new Date(),
      },
    });

    // Update lastLoginAt on user
    await prisma.user.update({
      where: { id: passkey.user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create session (iron-session)
    const session = await getSession();
    session.userId = passkey.user.id;
    session.email = passkey.user.email;
    session.name = passkey.user.name;
    session.role = passkey.user.role;
    session.profilePhoto = passkey.user.profilePhoto;
    session.isLoggedIn = true;
    await session.save();

    // Audit log
    await writeAuditLog({
      userId: passkey.user.id,
      action: AuditAction.USER_LOGIN,
      entityType: "USER",
      entityId: passkey.user.id,
      metadata: {
        method: "PASSKEY",
        credentialId: passkey.credentialId,
        passkeyName: passkey.name,
      },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    const redirectUrl =
      passkey.user.role === "STAFF" ? "/staff" : "/dashboard";

    const res = NextResponse.json({
      success: true,
      user: {
        id: passkey.user.id,
        email: passkey.user.email,
        name: passkey.user.name,
        role: passkey.user.role,
      },
      redirectUrl,
    });

    res.cookies.delete(WEBAUTHN_CHALLENGE_COOKIE);
    return res;
  } catch (err: any) {
    console.error("Passkey login-verify error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to verify passkey login" },
      { status: 500 }
    );
  }
}
