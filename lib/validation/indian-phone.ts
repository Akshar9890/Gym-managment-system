// lib/validation/indian-phone.ts — Indian phone number validation
// Used server-side only (Zod schemas on API routes)

/**
 * Indian mobile numbers:
 * - 10 digits
 * - Start with 6, 7, 8, or 9
 * - Optional +91 or 91 prefix (stripped before validation)
 */
export function normalizeIndianPhone(input: string): string | null {
  // Remove all spaces, dashes, dots, parentheses
  let cleaned = input.replace(/[\s\-\.\(\)]/g, "");

  // Strip country code
  if (cleaned.startsWith("+91")) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith("91") && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }

  // Validate
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return cleaned;
  }

  return null;
}

export function isValidIndianPhone(input: string): boolean {
  return normalizeIndianPhone(input) !== null;
}

// Zod-compatible validator
export function indianPhoneValidator(val: string): boolean {
  return isValidIndianPhone(val);
}
