// lib/auth/audit.ts — AuditLog service
// Every administrative mutation must be recorded here.
// NEVER log secrets, passwords, or API tokens in oldValues/newValues/metadata.

import { prisma } from "@/lib/prisma";

export interface AuditLogParams {
  userId: string;
  action: string;        // e.g. "CREATE_MEMBER", "RENEW_MEMBERSHIP"
  entityType: string;    // e.g. "Member", "Membership", "Payment"
  entityId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string;
}

/**
 * Records an administrative action in the AuditLog.
 * This is fire-and-forget for performance but errors are caught and logged
 * without interrupting the main operation.
 */
export async function writeAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValues: (params.oldValues ?? undefined) as any,
        newValues: (params.newValues ?? undefined) as any,
        metadata: (params.metadata ?? undefined) as any,
        ipAddress: params.ipAddress,
      },
    });
  } catch (error) {
    // Audit log failure must never crash the main operation, but should surface in monitoring
    console.error("[AuditLog] Failed to write audit log entry:", {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Commonly used action constants
export const AuditAction = {
  // Member
  CREATE_MEMBER: "CREATE_MEMBER",
  UPDATE_MEMBER: "UPDATE_MEMBER",
  DEACTIVATE_MEMBER: "DEACTIVATE_MEMBER",

  // Membership
  CREATE_MEMBERSHIP: "CREATE_MEMBERSHIP",
  RENEW_MEMBERSHIP: "RENEW_MEMBERSHIP",
  CANCEL_MEMBERSHIP: "CANCEL_MEMBERSHIP",
  OVERRIDE_START_DATE: "OVERRIDE_START_DATE",
  PAUSE_MEMBERSHIP: "PAUSE_MEMBERSHIP",

  // Payment
  RECORD_PAYMENT: "RECORD_PAYMENT",
  VERIFY_PAYMENT: "VERIFY_PAYMENT",
  REJECT_PAYMENT: "REJECT_PAYMENT",
  REFUND_PAYMENT: "REFUND_PAYMENT",

  // Plan
  CREATE_PLAN: "CREATE_PLAN",
  UPDATE_PLAN: "UPDATE_PLAN",
  DEACTIVATE_PLAN: "DEACTIVATE_PLAN",

  // Notification
  SEND_MANUAL_REMINDER: "SEND_MANUAL_REMINDER",

  // Staff & User Management
  CREATE_STAFF: "CREATE_STAFF",
  UPDATE_STAFF: "UPDATE_STAFF",
  DELETE_STAFF: "DELETE_STAFF",
  ACTIVATE_STAFF: "ACTIVATE_STAFF",
  DEACTIVATE_STAFF: "DEACTIVATE_STAFF",
  RESET_STAFF_PASSWORD: "RESET_STAFF_PASSWORD",
  CHANGE_PASSWORD: "CHANGE_PASSWORD",
  USER_LOGIN: "USER_LOGIN",
  USER_LOGOUT: "USER_LOGOUT",
  CREATE_USER: "CREATE_USER",
  UPDATE_USER: "UPDATE_USER",
  UPDATE_USER_ROLE: "UPDATE_USER_ROLE",
  DEACTIVATE_USER: "DEACTIVATE_USER",
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
