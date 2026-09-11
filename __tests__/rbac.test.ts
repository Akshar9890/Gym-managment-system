// __tests__/rbac.test.ts — RBAC unit tests (Phase 1)

// Note: These tests run without a DB — pure unit tests of the permission matrix.
// We mock @prisma/client to avoid needing a real DB connection.
jest.mock("@prisma/client", () => ({
  Role: {
    SUPER_ADMIN: "SUPER_ADMIN",
    ADMIN: "ADMIN",
    STAFF: "STAFF",
  },
}));

import { hasPermission, requirePermission, isAtLeastRole, requireRole, Permission } from "@/lib/rbac";
import { ForbiddenError } from "@/lib/auth/session";

describe("RBAC — hasPermission", () => {
  test("SUPER_ADMIN has all permissions", () => {
    expect(hasPermission("SUPER_ADMIN", Permission.MANAGE_USERS)).toBe(true);
    expect(hasPermission("SUPER_ADMIN", Permission.CREATE_MEMBER)).toBe(true);
    expect(hasPermission("SUPER_ADMIN", Permission.VIEW_AUDIT_LOG)).toBe(true);
    expect(hasPermission("SUPER_ADMIN", Permission.OVERRIDE_MEMBERSHIP_DATES)).toBe(true);
  });

  test("ADMIN has management permissions but NOT MANAGE_USERS", () => {
    expect(hasPermission("ADMIN", Permission.CREATE_MEMBER)).toBe(true);
    expect(hasPermission("ADMIN", Permission.VIEW_AUDIT_LOG)).toBe(true);
    expect(hasPermission("ADMIN", Permission.OVERRIDE_MEMBERSHIP_DATES)).toBe(true);
    expect(hasPermission("ADMIN", Permission.MANAGE_USERS)).toBe(false);
    expect(hasPermission("ADMIN", Permission.MANAGE_SYSTEM_SETTINGS)).toBe(false);
  });

  test("STAFF can create members, memberships, payments but NOT plans or reports", () => {
    expect(hasPermission("STAFF", Permission.CREATE_MEMBER)).toBe(true);
    expect(hasPermission("STAFF", Permission.RECORD_PAYMENT)).toBe(true);
    expect(hasPermission("STAFF", Permission.CREATE_MEMBERSHIP)).toBe(true);
    expect(hasPermission("STAFF", Permission.CREATE_PLAN)).toBe(false);
    expect(hasPermission("STAFF", Permission.VIEW_BASIC_REPORTS)).toBe(false);
    expect(hasPermission("STAFF", Permission.VIEW_AUDIT_LOG)).toBe(false);
    expect(hasPermission("STAFF", Permission.OVERRIDE_MEMBERSHIP_DATES)).toBe(false);
    expect(hasPermission("STAFF", Permission.MANAGE_USERS)).toBe(false);
  });
});

describe("RBAC — requirePermission", () => {
  test("does not throw when permission is granted", () => {
    expect(() => requirePermission("ADMIN", Permission.CREATE_MEMBER)).not.toThrow();
    expect(() => requirePermission("SUPER_ADMIN", Permission.MANAGE_USERS)).not.toThrow();
  });

  test("throws ForbiddenError when permission is denied", () => {
    expect(() => requirePermission("STAFF", Permission.MANAGE_USERS)).toThrow(ForbiddenError);
    expect(() => requirePermission("ADMIN", Permission.MANAGE_USERS)).toThrow(ForbiddenError);
    expect(() => requirePermission("STAFF", Permission.CREATE_PLAN)).toThrow(ForbiddenError);
  });
});

describe("RBAC — isAtLeastRole", () => {
  test("SUPER_ADMIN >= all roles", () => {
    expect(isAtLeastRole("SUPER_ADMIN", "SUPER_ADMIN")).toBe(true);
    expect(isAtLeastRole("SUPER_ADMIN", "ADMIN")).toBe(true);
    expect(isAtLeastRole("SUPER_ADMIN", "STAFF")).toBe(true);
  });

  test("ADMIN >= ADMIN and STAFF, but not SUPER_ADMIN", () => {
    expect(isAtLeastRole("ADMIN", "SUPER_ADMIN")).toBe(false);
    expect(isAtLeastRole("ADMIN", "ADMIN")).toBe(true);
    expect(isAtLeastRole("ADMIN", "STAFF")).toBe(true);
  });

  test("STAFF only >= STAFF", () => {
    expect(isAtLeastRole("STAFF", "SUPER_ADMIN")).toBe(false);
    expect(isAtLeastRole("STAFF", "ADMIN")).toBe(false);
    expect(isAtLeastRole("STAFF", "STAFF")).toBe(true);
  });
});

describe("RBAC — requireRole", () => {
  test("does not throw when role is sufficient", () => {
    expect(() => requireRole("SUPER_ADMIN", "ADMIN")).not.toThrow();
    expect(() => requireRole("ADMIN", "STAFF")).not.toThrow();
  });

  test("throws ForbiddenError when role is insufficient", () => {
    expect(() => requireRole("STAFF", "ADMIN")).toThrow(ForbiddenError);
    expect(() => requireRole("ADMIN", "SUPER_ADMIN")).toThrow(ForbiddenError);
  });
});
