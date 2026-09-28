// lib/auth/passkey.ts — WebAuthn / Passkey helper utilities
import crypto from "crypto";

export const WEBAUTHN_CHALLENGE_COOKIE = "bsf_webauthn_ch";

export function getWebAuthnConfig(req: Request) {
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "localhost";
  const hostname = host.split(":")[0];
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (hostname === "localhost" ? "http" : "https");
  const origin = `${proto}://${host}`;

  // Comprehensive origin list supporting direct Vercel deployment, custom domain,
  // Capacitor iOS/Android embedded WebView, and localhost dev environments
  const expectedOrigins = Array.from(
    new Set([
      origin,
      `https://${hostname}`,
      `http://${hostname}`,
      `https://${host}`,
      `http://${host}`,
      "https://gym-managment-system-eight.vercel.app",
      "capacitor://localhost",
      "ionic://localhost",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost",
    ])
  );

  const expectedRPIDs = Array.from(
    new Set([
      hostname,
      "gym-managment-system-eight.vercel.app",
      "localhost",
    ])
  );

  return {
    rpName: "BSF THE GYM",
    rpID: hostname,
    origin,
    expectedOrigins,
    expectedRPIDs,
  };
}

export function signChallenge(challenge: string, extraData?: string): string {
  const secret = process.env.SESSION_SECRET || "bsf-gym-passkey-default-secret-32-chars-long";
  const payload = extraData ? `${challenge}::${extraData}` : challenge;
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return `${Buffer.from(payload).toString("base64url")}.${hmac}`;
}

export function verifyChallenge(
  signedChallenge: string
): { challenge: string; extraData?: string } | null {
  try {
    const secret = process.env.SESSION_SECRET || "bsf-gym-passkey-default-secret-32-chars-long";
    const parts = signedChallenge.split(".");
    if (parts.length !== 2) return null;

    const [b64Payload, hmac] = parts;
    const payload = Buffer.from(b64Payload, "base64url").toString("utf-8");

    const expectedHmac = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    if (
      hmac.length !== expectedHmac.length ||
      !crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))
    ) {
      return null;
    }

    if (payload.includes("::")) {
      const [challenge, extraData] = payload.split("::");
      return { challenge, extraData };
    }

    return { challenge: payload };
  } catch {
    return null;
  }
}
