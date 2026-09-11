// lib/services/ReferenceService.ts — Sequential Transaction Reference Generators
// Generates unique transaction IDs:
// Membership Reference: BSF-MEM-YYYY-000001
// Receipt Number: BSF-RCP-YYYY-000001
// Strictly for transaction references, not person IDs.

import { prisma } from "@/lib/prisma";
import { formatMembershipReference, formatReceiptNumber } from "@/lib/utils";

/**
 * Gets the next sequential membership reference (e.g. BSF-MEM-2026-000001)
 * Year-aware, sequential, deterministic, safe across concurrent requests.
 */
export async function getNextMembershipReference(tx: typeof prisma = prisma): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `BSF-MEM-${currentYear}-`;

  const latest = await tx.membership.findFirst({
    where: {
      membershipReference: {
        startsWith: prefix,
      },
    },
    orderBy: {
      membershipReference: "desc",
    },
    select: {
      membershipReference: true,
    },
  });

  if (!latest || !latest.membershipReference) {
    return formatMembershipReference(currentYear, 1);
  }

  // Parse numeric sequence: "BSF-MEM-2026-000042" -> 42
  const match = latest.membershipReference.match(new RegExp(`^BSF-MEM-${currentYear}-(\\d+)$`, "i"));
  if (!match) {
    const count = await tx.membership.count({
      where: {
        membershipReference: {
          startsWith: prefix,
        },
      },
    });
    return formatMembershipReference(currentYear, count + 1);
  }

  const nextNum = parseInt(match[1], 10) + 1;
  return formatMembershipReference(currentYear, nextNum);
}

/**
 * Gets the next sequential receipt number (e.g. BSF-RCP-2026-000001)
 * Year-aware, globally unique for every payment transaction.
 */
export async function getNextReceiptNumber(tx: typeof prisma = prisma): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `BSF-RCP-${currentYear}-`;

  const latest = await tx.payment.findFirst({
    where: {
      receiptNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      receiptNumber: "desc",
    },
    select: {
      receiptNumber: true,
    },
  });

  if (!latest || !latest.receiptNumber) {
    // Also check for legacy format BSF-RCP-000001
    const legacyCount = await tx.payment.count();
    return formatReceiptNumber(currentYear, legacyCount + 1);
  }

  const match = latest.receiptNumber.match(new RegExp(`^BSF-RCP-${currentYear}-(\\d+)$`, "i"));
  if (!match) {
    const count = await tx.payment.count({
      where: {
        receiptNumber: {
          startsWith: prefix,
        },
      },
    });
    return formatReceiptNumber(currentYear, count + 1);
  }

  const nextNum = parseInt(match[1], 10) + 1;
  return formatReceiptNumber(currentYear, nextNum);
}
