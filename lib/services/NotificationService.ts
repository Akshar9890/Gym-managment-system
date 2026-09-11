// lib/services/NotificationService.ts — Notification dispatch & tracking
// Per DECISIONS.md D3: DB-level idempotency via unique(membershipId, type, triggerDate).
// Per DECISIONS.md D4 & D5: Uses WhatsAppService abstraction, logs simulated in dev.

import { prisma } from "@/lib/prisma";
import { getWhatsAppService } from "@/lib/whatsapp/WhatsAppService";
import { normalizeCalendarDate } from "@/lib/services/MembershipDateService";
import { formatDate } from "@/lib/utils";
import { NotificationChannel, NotificationStatus, NotificationType, MembershipStatus } from "@prisma/client";
import { writeAuditLog, AuditAction } from "@/lib/auth/audit";

export interface Send10DayReminderResult {
  success: boolean;
  skippedAlreadySent?: boolean;
  notificationId?: string;
  error?: string;
}

/**
 * Sends the automated 10-day expiry reminder for a given membership.
 * Strictly idempotent: will NOT send if already recorded for this membership on this triggerDate.
 */
export async function send10DayExpiryReminder(
  membershipId: string,
  referenceDate?: Date
): Promise<Send10DayReminderResult> {
  const triggerDate = referenceDate
    ? normalizeCalendarDate(referenceDate)
    : normalizeCalendarDate(new Date());

  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: {
      member: true,
      plan: true,
    },
  });

  if (!membership) {
    return { success: false, error: "Membership not found" };
  }

  // Check DB idempotency: has a 10-day reminder already been recorded for this membership?
  const existingNotification = await prisma.notification.findFirst({
    where: {
      membershipId: membership.id,
      type: NotificationType.EXPIRY_REMINDER_10_DAY,
    },
  });

  if (existingNotification) {
    return {
      success: true,
      skippedAlreadySent: true,
      notificationId: existingNotification.id,
    };
  }

  // Check if member already has a subsequent active membership (renewed in advance)
  const futureRenewal = await prisma.membership.findFirst({
    where: {
      memberId: membership.memberId,
      id: { not: membership.id },
      startDate: { gte: membership.endDate },
      membershipStatus: MembershipStatus.ACTIVE,
    },
  });

  if (futureRenewal) {
    return {
      success: true,
      skippedAlreadySent: true, // Skipped because member has already renewed in advance
    };
  }

  const recipientPhone = membership.member.whatsappNumber || membership.member.phoneNumber;
  const whatsapp = await getWhatsAppService();

  const variables = {
    member_name: membership.member.fullName,
    plan_name: membership.plan.name,
    expiry_date: formatDate(membership.endDate),
    days_remaining: "10",
  };

  const sendResult = await whatsapp.sendTemplateMessage(
    recipientPhone,
    "membership_expiry_10_days",
    variables
  );

  let status: NotificationStatus = NotificationStatus.PENDING;
  if (sendResult.status === "SIMULATED") {
    status = NotificationStatus.SIMULATED;
  } else if (sendResult.status === "SENT") {
    status = NotificationStatus.SENT;
  } else {
    status = NotificationStatus.FAILED;
  }

  // Record notification in DB (unique constraint guarantees atomic idempotency)
  try {
    const notification = await prisma.notification.create({
      data: {
        memberId: membership.member.id,
        membershipId: membership.id,
        type: NotificationType.EXPIRY_REMINDER_10_DAY,
        channel: NotificationChannel.WHATSAPP,
        status,
        recipientNumber: recipientPhone,
        triggerDate,
        sentAt: sendResult.success ? new Date() : null,
        providerMessageId: sendResult.providerMessageId || null,
        errorDetails: sendResult.errorMessage || null,
        metadata: {
          template: "membership_expiry_10_days",
          variables,
          isDevMode: whatsapp.isDevMode(),
        },
      },
    });

    return {
      success: sendResult.success,
      notificationId: notification.id,
      error: sendResult.errorMessage,
    };
  } catch (dbError: any) {
    // Unique constraint violation: caught concurrent attempt
    if (dbError.code === "P2002") {
      return { success: true, skippedAlreadySent: true };
    }
    throw dbError;
  }
}

/**
 * Sends a manual reminder triggered by admin/staff.
 */
export async function sendManualReminder(
  membershipId: string,
  sentByUserId: string,
  customNote?: string
) {
  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: {
      member: true,
      plan: true,
    },
  });

  if (!membership) {
    throw new Error("Membership not found");
  }

  const recipientPhone = membership.member.whatsappNumber || membership.member.phoneNumber;
  const whatsapp = await getWhatsAppService();

  const variables = {
    member_name: membership.member.fullName,
    plan_name: membership.plan.name,
    expiry_date: formatDate(membership.endDate),
    custom_note: customNote || "Please renew to continue your workout uninterrupted.",
  };

  const sendResult = await whatsapp.sendTemplateMessage(
    recipientPhone,
    "membership_expiry_manual",
    variables
  );

  let status: NotificationStatus = NotificationStatus.PENDING;
  if (sendResult.status === "SIMULATED") {
    status = NotificationStatus.SIMULATED;
  } else if (sendResult.status === "SENT") {
    status = NotificationStatus.SENT;
  } else {
    status = NotificationStatus.FAILED;
  }

  const triggerDate = normalizeCalendarDate(new Date());

  const notification = await prisma.notification.upsert({
    where: {
      idempotency_key: {
        membershipId: membership.id,
        type: NotificationType.EXPIRY_REMINDER_MANUAL,
        triggerDate,
      },
    },
    update: {
      status,
      recipientNumber: recipientPhone,
      sentAt: sendResult.success ? new Date() : null,
      providerMessageId: sendResult.providerMessageId || null,
      errorDetails: sendResult.errorMessage || null,
      metadata: { variables, sentByUserId },
    },
    create: {
      memberId: membership.member.id,
      membershipId: membership.id,
      type: NotificationType.EXPIRY_REMINDER_MANUAL,
      channel: NotificationChannel.WHATSAPP,
      status,
      recipientNumber: recipientPhone,
      triggerDate,
      sentAt: sendResult.success ? new Date() : null,
      providerMessageId: sendResult.providerMessageId || null,
      errorDetails: sendResult.errorMessage || null,
      metadata: { variables, sentByUserId },
    },
  });

  await writeAuditLog({
    userId: sentByUserId,
    action: AuditAction.SEND_MANUAL_REMINDER,
    entityType: "Notification",
    entityId: notification.id,
    newValues: {
      memberId: membership.member.id,
      recipientPhone,
      status,
    },
  });

  return notification;
}
