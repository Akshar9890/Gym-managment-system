// lib/services/MembershipLifecycleService.ts — Membership state transitions
// Handles ACTIVE -> EXPIRING_SOON (<= 10 days) -> EXPIRED (< 0 days)
// Safe to run repeatedly; idempotent status updates.

import { prisma } from "@/lib/prisma";
import { MembershipStatus } from "@prisma/client";
import { normalizeCalendarDate, getDaysUntilExpiry } from "./MembershipDateService";

export interface LifecycleTransitionResult {
  transitionedToExpiringSoon: number;
  transitionedToExpired: number;
  alreadyUpToDate: number;
  errors: Array<{ membershipId: string; error: string }>;
}

/**
 * Calculates what the current status should be for a membership based on its dates
 * and its current status (preserving CANCELLED and PAUSED manual overrides).
 */
export function determineMembershipStatus(
  startDate: Date | string,
  endDate: Date | string,
  currentStatus: MembershipStatus,
  referenceDate?: Date,
  hasSubsequentActiveMembership: boolean = false
): MembershipStatus {
  // Manual overrides must NOT be automatically overwritten by lifecycle engine
  if (currentStatus === MembershipStatus.CANCELLED || currentStatus === MembershipStatus.PAUSED) {
    return currentStatus;
  }

  const today = referenceDate ? normalizeCalendarDate(referenceDate) : normalizeCalendarDate(new Date());
  const start = normalizeCalendarDate(startDate);
  const end = normalizeCalendarDate(endDate);

  // If start date is in future, it's not active yet or future active
  if (today < start) {
    return MembershipStatus.ACTIVE;
  }

  const daysLeft = getDaysUntilExpiry(end, today);

  if (daysLeft < 0) {
    return MembershipStatus.EXPIRED;
  }

  // If the member has already renewed in advance (subsequent active membership exists),
  // they are NOT expiring soon — their membership continuity is active!
  if (hasSubsequentActiveMembership) {
    return MembershipStatus.ACTIVE;
  }

  if (daysLeft <= 10) {
    return MembershipStatus.EXPIRING_SOON;
  }

  return MembershipStatus.ACTIVE;
}

/**
 * Evaluates all non-terminal memberships and updates statuses to reflect current date.
 * Typically invoked by the daily membership-lifecycle-job or on-demand by admin.
 */
export async function processLifecycleTransitions(
  referenceDate?: Date
): Promise<LifecycleTransitionResult> {
  const today = referenceDate ? normalizeCalendarDate(referenceDate) : normalizeCalendarDate(new Date());

  const result: LifecycleTransitionResult = {
    transitionedToExpiringSoon: 0,
    transitionedToExpired: 0,
    alreadyUpToDate: 0,
    errors: [],
  };

  // Find all memberships that might need updating (exclude already CANCELLED and PAUSED)
  const candidateMemberships = await prisma.membership.findMany({
    where: {
      membershipStatus: {
        in: [MembershipStatus.ACTIVE, MembershipStatus.EXPIRING_SOON],
      },
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      membershipStatus: true,
      memberId: true,
    },
  });

  // Fetch all active memberships to check for advance renewals
  const allActiveMemberships = await prisma.membership.findMany({
    where: {
      membershipStatus: MembershipStatus.ACTIVE,
    },
    select: {
      id: true,
      memberId: true,
      startDate: true,
      endDate: true,
    },
  });

  for (const m of candidateMemberships) {
    try {
      // Check if member already has a subsequent active membership (paid advance renewal)
      const hasSubsequentActiveMembership = allActiveMemberships.some(
        (other: { memberId: string; id: string; startDate: Date; endDate: Date }) =>
          other.memberId === m.memberId &&
          other.id !== m.id &&
          new Date(other.startDate) >= new Date(m.endDate)
      );

      const targetStatus = determineMembershipStatus(
        m.startDate,
        m.endDate,
        m.membershipStatus,
        today,
        hasSubsequentActiveMembership
      );

      if (targetStatus !== m.membershipStatus) {
        await prisma.membership.update({
          where: { id: m.id },
          data: { membershipStatus: targetStatus },
        });

        if (targetStatus === MembershipStatus.EXPIRING_SOON) {
          result.transitionedToExpiringSoon++;
        } else if (targetStatus === MembershipStatus.EXPIRED) {
          result.transitionedToExpired++;
        }
      } else {
        result.alreadyUpToDate++;
      }
    } catch (err: any) {
      result.errors.push({
        membershipId: m.id,
        error: err.message || String(err),
      });
    }
  }

  return result;
}
