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

  return {
    rpName: "BSF THE GYM",
    rpID: hostname,
    origin,
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
