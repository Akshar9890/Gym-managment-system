// lib/services/MembershipDateService.ts — Membership date calculations
// Per DECISIONS.md D1:
// Rule: endDate = addCalendarUnits(startDate, duration, unit) - 1 day
// Renewal continuity: next startDate = previous endDate + 1 day
// Timezone: Asia/Kolkata civil dates (midnight UTC for calendar date representation)

import { addDays, addMonths, subDays, format, parseISO } from "date-fns";

export interface PlanDuration {
  durationMonths: number;
  durationDays?: number;
}

/**
 * Normalizes a date to a calendar date (midnight UTC corresponding to Asia/Kolkata date)
 */
export function normalizeCalendarDate(date: Date | string): Date {
  const d = typeof date === "string" ? parseISO(date) : date;
  // Format as YYYY-MM-DD in Asia/Kolkata
  const kolkataStr = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return new Date(`${kolkataStr}T00:00:00.000Z`);
}

/**
 * Calculates inclusive end date for a membership.
 * endDate = addMonths(startDate, durationMonths) + addDays(durationDays) - 1 day
 * Examples:
 * - 11 Sep 2026 + 1 Month  -> 10 Oct 2026
 * - 11 Sep 2026 + 3 Months -> 10 Dec 2026
 * - 11 Sep 2026 + 6 Months -> 10 Mar 2027
 * - 11 Sep 2026 + 12 Months -> 10 Sep 2027
 */
export function calculateEndDate(
  startDate: Date | string,
  plan: PlanDuration
): Date {
  const start = normalizeCalendarDate(startDate);

  let target = start;
  if (plan.durationMonths && plan.durationMonths > 0) {
    target = addMonths(target, plan.durationMonths);
  }
  if (plan.durationDays && plan.durationDays > 0) {
    target = addDays(target, plan.durationDays);
  }

  // Subtract 1 day for inclusive end date
  const inclusiveEnd = subDays(target, 1);
  return normalizeCalendarDate(inclusiveEnd);
}

/**
 * Calculates start date for a renewal membership.
 * Per D1: previous endDate + 1 day guarantees no gap and no overlap.
 */
export function calculateRenewalStartDate(previousEndDate: Date | string): Date {
  const prevEnd = normalizeCalendarDate(previousEndDate);
  const nextStart = addDays(prevEnd, 1);
  return normalizeCalendarDate(nextStart);
}

/**
 * Computes remaining days until expiry relative to today in Asia/Kolkata.
 * Positive = active/expiring in future
 * 0 = expires today
 * Negative = expired N days ago
 */
export function getDaysUntilExpiry(endDate: Date | string, referenceDate?: Date): number {
  const ref = referenceDate ? normalizeCalendarDate(referenceDate) : normalizeCalendarDate(new Date());
  const end = normalizeCalendarDate(endDate);

  const diffMs = end.getTime() - ref.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Checks if two inclusive date intervals [startA, endA] and [startB, endB] overlap.
 * Under D1 policy, consecutive days do NOT overlap (e.g. 10th Oct and 11th Oct).
 */
export function areIntervalsOverlapping(
  startA: Date | string,
  endA: Date | string,
  startB: Date | string,
  endB: Date | string
): boolean {
  const sA = normalizeCalendarDate(startA);
  const eA = normalizeCalendarDate(endA);
  const sB = normalizeCalendarDate(startB);
  const eB = normalizeCalendarDate(endB);

  return sA <= eB && eA >= sB;
}

export interface OverlapCheckResult {
  hasOverlap: boolean;
  conflictingMembershipId?: string;
  conflictingRange?: string;
  error?: string;
}

/**
 * Checks if a member has any existing active/expiring/paused membership that overlaps with [startDate, endDate].
 * Excludes CANCELLED memberships (which do not claim gym time).
 */
export async function findConflictingMembership(
  memberId: string,
  startDate: Date | string,
  endDate: Date | string,
  excludeMembershipId?: string,
  prismaClient?: any
): Promise<OverlapCheckResult> {
  const prisma = prismaClient || (await import("@/lib/prisma")).prisma;
  const sDate = normalizeCalendarDate(startDate);
  const eDate = normalizeCalendarDate(endDate);

  const existingMemberships = await prisma.membership.findMany({
    where: {
      memberId,
      id: excludeMembershipId ? { not: excludeMembershipId } : undefined,
      membershipStatus: {
        notIn: ["CANCELLED"],
      },
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      membershipStatus: true,
      plan: { select: { name: true } },
    },
  });

  for (const m of existingMemberships) {
    if (areIntervalsOverlapping(sDate, eDate, m.startDate, m.endDate)) {
      const range = `${m.startDate.toISOString().slice(0, 10)} to ${m.endDate.toISOString().slice(0, 10)}`;
      return {
        hasOverlap: true,
        conflictingMembershipId: m.id,
        conflictingRange: range,
        error: `Overlaps with existing membership (${m.plan?.name || "Membership"}, ${range}, status: ${m.membershipStatus})`,
      };
    }
  }

  return { hasOverlap: false };
}
