// lib/rbac.ts — Role-Based Access Control
// ALL permission checks happen server-side. Client never supplies role.
// Role hierarchy: SUPER_ADMIN > ADMIN > STAFF

import { Role } from "@prisma/client";
import { ForbiddenError } from "./auth/session";

// ─────────────────────────────────────────────────────────────────────────────
// Permission definitions
// ─────────────────────────────────────────────────────────────────────────────

export const Permission = {
  // Member management
  CREATE_MEMBER: "CREATE_MEMBER",
  READ_MEMBER: "READ_MEMBER",
  UPDATE_MEMBER: "UPDATE_MEMBER",
  DELETE_MEMBER: "DELETE_MEMBER",

  // Membership management
  CREATE_MEMBERSHIP: "CREATE_MEMBERSHIP",
  READ_MEMBERSHIP: "READ_MEMBERSHIP",
  UPDATE_MEMBERSHIP: "UPDATE_MEMBERSHIP",
  CANCEL_MEMBERSHIP: "CANCEL_MEMBERSHIP",
  OVERRIDE_MEMBERSHIP_DATES: "OVERRIDE_MEMBERSHIP_DATES", // ADMIN+ only

  // Plans management
  READ_PLAN: "READ_PLAN",
  CREATE_PLAN: "CREATE_PLAN",     // ADMIN+ only
  UPDATE_PLAN: "UPDATE_PLAN",     // ADMIN+ only
  DEACTIVATE_PLAN: "DEACTIVATE_PLAN", // ADMIN+ only

  // Payments
  RECORD_PAYMENT: "RECORD_PAYMENT",
  READ_PAYMENT: "READ_PAYMENT",
  VERIFY_PAYMENT: "VERIFY_PAYMENT", // ADMIN+ only (staff can never verify payments)
  REFUND_PAYMENT: "REFUND_PAYMENT", // ADMIN+ only
  VIEW_RECEIPT: "VIEW_RECEIPT",

  // Notifications
  VIEW_NOTIFICATIONS: "VIEW_NOTIFICATIONS",
  SEND_MANUAL_REMINDER: "SEND_MANUAL_REMINDER",
  MARK_NOTIFICATION_READ: "MARK_NOTIFICATION_READ",

  // Reports
  VIEW_BASIC_REPORTS: "VIEW_BASIC_REPORTS", // ADMIN+
  EXPORT_REPORTS: "EXPORT_REPORTS",          // ADMIN+

  // Audit
  VIEW_AUDIT_LOG: "VIEW_AUDIT_LOG", // ADMIN+
  VIEW_JOB_EXECUTIONS: "VIEW_JOB_EXECUTIONS", // ADMIN+

  // Staff & User management
  MANAGE_STAFF: "MANAGE_STAFF",                     // ADMIN+ only
  VIEW_STAFF_PERFORMANCE: "VIEW_STAFF_PERFORMANCE", // ADMIN+ only
  VIEW_OWN_PERFORMANCE: "VIEW_OWN_PERFORMANCE",     // STAFF, ADMIN, SUPER_ADMIN
  MANAGE_USERS: "MANAGE_USERS",                     // SUPER_ADMIN only
  MANAGE_SYSTEM_SETTINGS: "MANAGE_SYSTEM_SETTINGS", // SUPER_ADMIN only
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

// ─────────────────────────────────────────────────────────────────────────────
// Role → Permission matrix
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  STAFF: [
    Permission.CREATE_MEMBER,
    Permission.READ_MEMBER,
    Permission.UPDATE_MEMBER,
    Permission.CREATE_MEMBERSHIP,
    Permission.READ_MEMBERSHIP,
    Permission.RECORD_PAYMENT,
    Permission.READ_PAYMENT,
    Permission.VIEW_RECEIPT,
    Permission.READ_PLAN,
    Permission.VIEW_NOTIFICATIONS,
    Permission.SEND_MANUAL_REMINDER,
    Permission.MARK_NOTIFICATION_READ,
    Permission.VIEW_OWN_PERFORMANCE,
  ],

  ADMIN: [
    // All STAFF permissions, plus:
    Permission.CREATE_MEMBER,
    Permission.READ_MEMBER,
    Permission.UPDATE_MEMBER,
    Permission.DELETE_MEMBER,
    Permission.CREATE_MEMBERSHIP,
    Permission.READ_MEMBERSHIP,
    Permission.UPDATE_MEMBERSHIP,
    Permission.CANCEL_MEMBERSHIP,
    Permission.OVERRIDE_MEMBERSHIP_DATES,
    Permission.READ_PLAN,
    Permission.CREATE_PLAN,
    Permission.UPDATE_PLAN,
    Permission.DEACTIVATE_PLAN,
    Permission.RECORD_PAYMENT,
    Permission.READ_PAYMENT,
    Permission.VERIFY_PAYMENT,
    Permission.REFUND_PAYMENT,
    Permission.VIEW_RECEIPT,
    Permission.VIEW_NOTIFICATIONS,
    Permission.SEND_MANUAL_REMINDER,
    Permission.MARK_NOTIFICATION_READ,
    Permission.VIEW_BASIC_REPORTS,
    Permission.EXPORT_REPORTS,
    Permission.VIEW_AUDIT_LOG,
    Permission.VIEW_JOB_EXECUTIONS,
    Permission.MANAGE_STAFF,
    Permission.VIEW_STAFF_PERFORMANCE,
    Permission.VIEW_OWN_PERFORMANCE,
  ],

  SUPER_ADMIN: [
    // All ADMIN permissions, plus:
    Permission.CREATE_MEMBER,
    Permission.READ_MEMBER,
    Permission.UPDATE_MEMBER,
    Permission.DELETE_MEMBER,
    Permission.CREATE_MEMBERSHIP,
    Permission.READ_MEMBERSHIP,
    Permission.UPDATE_MEMBERSHIP,
    Permission.CANCEL_MEMBERSHIP,
    Permission.OVERRIDE_MEMBERSHIP_DATES,
    Permission.READ_PLAN,
    Permission.CREATE_PLAN,
    Permission.UPDATE_PLAN,
    Permission.DEACTIVATE_PLAN,
    Permission.RECORD_PAYMENT,
    Permission.READ_PAYMENT,
    Permission.VERIFY_PAYMENT,
    Permission.REFUND_PAYMENT,
    Permission.VIEW_RECEIPT,
    Permission.VIEW_NOTIFICATIONS,
    Permission.SEND_MANUAL_REMINDER,
    Permission.MARK_NOTIFICATION_READ,
    Permission.VIEW_BASIC_REPORTS,
    Permission.EXPORT_REPORTS,
    Permission.VIEW_AUDIT_LOG,
    Permission.VIEW_JOB_EXECUTIONS,
    Permission.MANAGE_STAFF,
    Permission.VIEW_STAFF_PERFORMANCE,
    Permission.VIEW_OWN_PERFORMANCE,
    Permission.MANAGE_USERS,
    Permission.MANAGE_SYSTEM_SETTINGS,
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true if the role has the given permission. */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Throws ForbiddenError if the role lacks the given permission.
 * Use this in API routes / server actions — every sensitive route, always server-side.
 */
export function requirePermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new ForbiddenError(
      `Role '${role}' does not have permission '${permission}'`
    );
  }
}

/** Returns true if roleA is at least as privileged as roleB. */
export function isAtLeastRole(userRole: Role, minimumRole: Role): boolean {
  const hierarchy: Role[] = ["STAFF", "ADMIN", "SUPER_ADMIN"];
  return hierarchy.indexOf(userRole) >= hierarchy.indexOf(minimumRole);
}

/**
 * Throws ForbiddenError if the user's role is below the minimum required.
 */
export function requireRole(userRole: Role, minimumRole: Role): void {
  if (!isAtLeastRole(userRole, minimumRole)) {
    throw new ForbiddenError(
      `This action requires at least '${minimumRole}' role. Your role: '${userRole}'`
    );
  }
}
