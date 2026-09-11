// lib/auth/password.ts — Password hashing with bcryptjs
// RULES.md allows Argon2 or bcrypt. Using bcryptjs (pure JS, no native compilation).
// Can be upgraded to Argon2 later without changing callers.
// Passwords are NEVER stored plaintext, NEVER logged.

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Hashes a plain-text password with bcrypt.
 * Never log the input or output of this function.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

/**
 * Verifies a plain-text password against a bcrypt hash.
 * Returns true if they match, false otherwise.
 * Never log the plaintext password.
 */
export async function verifyPassword(
  hash: string,
  plaintext: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(plaintext, hash);
  } catch {
    return false;
  }
}
