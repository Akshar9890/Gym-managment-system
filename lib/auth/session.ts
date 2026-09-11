// lib/auth/session.ts — HTTP-only cookie session management (iron-session)
// Sessions are server-side only; the client never receives role or sensitive data.

import { getIronSession, IronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  role: Role;
  profilePhoto?: string | null;
  isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: process.env.SESSION_COOKIE_NAME || "bsf_gym_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session;
}

export async function requireSession(): Promise<SessionData> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    throw new AuthError("Unauthorized: not logged in");
  }
  return session as SessionData;
}

export class AuthError extends Error {
  public readonly status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export class ForbiddenError extends Error {
  public readonly status: number;
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
    this.status = 403;
  }
}
