// lib/jobs/membership-lifecycle-job.ts — Daily automated lifecycle job
// Orchestrates:
// 1. Status transitions: ACTIVE -> EXPIRING_SOON (<= 10 days) -> EXPIRED (< 0 days)
// 2. 10-day WhatsApp expiry reminder dispatch (strictly idempotent per DECISIONS.md D3)
// 3. Full execution tracking in JobExecution model for auditability & observability

import { prisma } from "@/lib/prisma";
import { JobStatus, MembershipStatus, NotificationType } from "@prisma/client";
import { processLifecycleTransitions } from "@/lib/services/MembershipLifecycleService";
import { send10DayExpiryReminder } from "@/lib/services/NotificationService";
import { normalizeCalendarDate, getDaysUntilExpiry } from "@/lib/services/MembershipDateService";

export interface JobExecutionReport {
  jobExecutionId: string;
  startedAt: Date;
  completedAt: Date;
  status: JobStatus;
  transitions: {
    transitionedToExpiringSoon: number;
    transitionedToExpired: number;
    alreadyUpToDate: number;
  };
  reminders: {
    dueCount: number;
    sentCount: number;
    skippedCount: number;
    failedCount: number;
  };
  errors: string[];
}

/**
 * Runs the daily membership lifecycle job.
 * Safe to execute concurrently or multiple times per day (idempotent).
 */
export async function runMembershipLifecycleJob(
  referenceDate?: Date
): Promise<JobExecutionReport> {
  const today = referenceDate
    ? normalizeCalendarDate(referenceDate)
    : normalizeCalendarDate(new Date());

  // 1. Create JobExecution record
  const jobExecution = await prisma.jobExecution.create({
    data: {
      jobName: "membership-lifecycle-job",
      startedAt: new Date(),
      status: JobStatus.RUNNING,
    },
  });

  const errors: string[] = [];
  let sentCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  try {
    // 2. Process status transitions
    const transitionResult = await processLifecycleTransitions(today);
    if (transitionResult.errors.length > 0) {
      errors.push(...transitionResult.errors.map(e => `Transition error on ${e.membershipId}: ${e.error}`));
    }

    // 3. Find memberships due for the 10-day WhatsApp reminder
    // Candidates are EXPIRING_SOON or ACTIVE where days until expiry is <= 10 and >= 0
    const candidateMemberships = await prisma.membership.findMany({
      where: {
        membershipStatus: {
          in: [MembershipStatus.ACTIVE, MembershipStatus.EXPIRING_SOON],
        },
      },
      include: {
        member: true,
        plan: true,
      },
    });

    // Filter to those with exactly 10 days remaining (or <= 10 days that haven't been reminded yet)
    const dueMemberships = candidateMemberships.filter((m) => {
      const daysLeft = getDaysUntilExpiry(m.endDate, today);
      return daysLeft <= 10 && daysLeft >= 0;
    });

    // 4. Send reminders idempotently
    for (const membership of dueMemberships) {
      try {
        const reminderResult = await send10DayExpiryReminder(membership.id, today);

        if (reminderResult.skippedAlreadySent) {
          skippedCount++;
        } else if (reminderResult.success) {
          sentCount++;
        } else {
          failedCount++;
          if (reminderResult.error) {
            errors.push(`Failed sending reminder to membership ${membership.id}: ${reminderResult.error}`);
          }
        }
      } catch (err: any) {
        failedCount++;
        errors.push(`Exception sending reminder to membership ${membership.id}: ${err.message || String(err)}`);
      }
    }

    const completedAt = new Date();
    const finalStatus = errors.length > 0 && sentCount === 0 && dueMemberships.length > 0
      ? JobStatus.FAILED
      : errors.length > 0
      ? JobStatus.PARTIAL
      : JobStatus.COMPLETED;

    // 5. Update JobExecution record
    await prisma.jobExecution.update({
      where: { id: jobExecution.id },
      data: {
        status: finalStatus,
        completedAt,
        processedCount: dueMemberships.length,
        successCount: sentCount,
        failureCount: failedCount,
        skippedCount,
        errorDetails: errors.length > 0 ? errors.slice(0, 10).join("\n") : null,
        metadata: {
          referenceDate: today.toISOString(),
          transitions: transitionResult,
          dueCount: dueMemberships.length,
        } as any,
      },
    });

    return {
      jobExecutionId: jobExecution.id,
      startedAt: jobExecution.startedAt,
      completedAt,
      status: finalStatus,
      transitions: {
        transitionedToExpiringSoon: transitionResult.transitionedToExpiringSoon,
        transitionedToExpired: transitionResult.transitionedToExpired,
        alreadyUpToDate: transitionResult.alreadyUpToDate,
      },
      reminders: {
        dueCount: dueMemberships.length,
        sentCount,
        skippedCount,
        failedCount,
      },
      errors,
    };
  } catch (fatalError: any) {
    const completedAt = new Date();
    const message = fatalError.message || String(fatalError);

    await prisma.jobExecution.update({
      where: { id: jobExecution.id },
      data: {
        status: JobStatus.FAILED,
        completedAt,
        errorDetails: `Fatal job error: ${message}`,
      },
    });

    throw fatalError;
  }
}
