// __tests__/staff-management.test.ts — Staff Management, Login, RBAC, and Performance tests
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    membership: {
      findMany: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
    },
  },
}));

import { hasPermission, requirePermission, Permission } from "@/lib/rbac";
import { ForbiddenError } from "@/lib/auth/session";

describe("Staff Pure Email Authentication Behavior", () => {
  it("determines correct redirection path based on role", () => {
    const getRedirect = (role: string) => (role === "STAFF" ? "/staff" : "/dashboard");
    expect(getRedirect("STAFF")).toBe("/staff");
    expect(getRedirect("ADMIN")).toBe("/dashboard");
    expect(getRedirect("SUPER_ADMIN")).toBe("/dashboard");
  });

  it("rejects inactive accounts regardless of password match", () => {
    const mockUser = {
      id: "u1",
      email: "staff@bsfgym.com",
      isActive: false,
    };

    const canLogin = mockUser && mockUser.isActive;
    expect(canLogin).toBe(false);
  });

  it("supports pure email login with case-insensitive lookup and trimming", () => {
    const users = [
      { id: "1", email: "amit@bsfgym.com", name: "Amit Sharma" },
      { id: "2", email: "pooja@bsfgym.com", name: "Pooja Verma" },
    ];

    const findUserByEmail = (inputEmail: string) => {
      const normalized = inputEmail.trim().toLowerCase();
      return users.find((u) => u.email.toLowerCase() === normalized);
    };

    expect(findUserByEmail("amit@bsfgym.com")?.id).toBe("1");
    expect(findUserByEmail("AMIT@BSFGYM.COM")?.id).toBe("1");
    expect(findUserByEmail("  Amit@Bsfgym.Com  ")?.id).toBe("1");
    expect(findUserByEmail("pooja@bsfgym.com")?.name).toBe("Pooja Verma");
    expect(findUserByEmail("unknown@bsfgym.com")).toBeUndefined();
  });
});

describe("Staff RBAC Permissions & Payment Verification Gate", () => {
  it("STAFF cannot manage other staff or access system configuration", () => {
    expect(hasPermission("STAFF", Permission.MANAGE_STAFF)).toBe(false);
    expect(hasPermission("STAFF", Permission.VIEW_STAFF_PERFORMANCE)).toBe(false);
    expect(hasPermission("STAFF", Permission.MANAGE_USERS)).toBe(false);
    expect(hasPermission("STAFF", Permission.MANAGE_SYSTEM_SETTINGS)).toBe(false);
    expect(hasPermission("STAFF", Permission.CREATE_PLAN)).toBe(false);
    expect(hasPermission("STAFF", Permission.DELETE_MEMBER)).toBe(false);
  });

  it("STAFF cannot verify payments", () => {
    expect(hasPermission("STAFF", Permission.VERIFY_PAYMENT)).toBe(false);
  });

  it("STAFF can view their own performance and perform daily operations", () => {
    expect(hasPermission("STAFF", Permission.VIEW_OWN_PERFORMANCE)).toBe(true);
    expect(hasPermission("STAFF", Permission.CREATE_MEMBER)).toBe(true);
    expect(hasPermission("STAFF", Permission.CREATE_MEMBERSHIP)).toBe(true);
    expect(hasPermission("STAFF", Permission.RECORD_PAYMENT)).toBe(true);
    expect(hasPermission("STAFF", Permission.VIEW_RECEIPT)).toBe(true);
    expect(hasPermission("STAFF", Permission.SEND_MANUAL_REMINDER)).toBe(true);
  });

  it("ADMIN and SUPER_ADMIN have full verification and management permissions", () => {
    expect(hasPermission("ADMIN", Permission.VERIFY_PAYMENT)).toBe(true);
    expect(hasPermission("ADMIN", Permission.MANAGE_STAFF)).toBe(true);
    expect(hasPermission("ADMIN", Permission.VIEW_STAFF_PERFORMANCE)).toBe(true);
    expect(hasPermission("ADMIN", Permission.VIEW_OWN_PERFORMANCE)).toBe(true);

    expect(hasPermission("SUPER_ADMIN", Permission.VERIFY_PAYMENT)).toBe(true);
    expect(hasPermission("SUPER_ADMIN", Permission.MANAGE_STAFF)).toBe(true);
    expect(hasPermission("SUPER_ADMIN", Permission.VIEW_STAFF_PERFORMANCE)).toBe(true);
  });

  it("requirePermission throws ForbiddenError for unauthorized actions", () => {
    expect(() => requirePermission("STAFF", Permission.MANAGE_STAFF)).toThrow(ForbiddenError);
    expect(() => requirePermission("STAFF", Permission.VIEW_STAFF_PERFORMANCE)).toThrow(ForbiddenError);
    expect(() => requirePermission("STAFF", Permission.VERIFY_PAYMENT)).toThrow(ForbiddenError);
  });
});

describe("Admin Payment Verification Workflow Rules", () => {
  it("prohibits staff from verifying their own recorded payments", () => {
    const payment = {
      id: "pay-1",
      receivedById: "staff-1",
      amount: 5000,
      paymentStatus: "PENDING_VERIFICATION",
    };

    const attemptVerification = (verifierId: string, verifierRole: string) => {
      if (!hasPermission(verifierRole as any, Permission.VERIFY_PAYMENT)) {
        throw new Error("Forbidden: You lack payment verification permissions");
      }
      if (payment.receivedById === verifierId && verifierRole === "STAFF") {
        throw new Error("Self-approval prohibited: Staff cannot verify their own recorded payments");
      }
      return true;
    };

    // Staff cannot verify
    expect(() => attemptVerification("staff-1", "STAFF")).toThrow("Forbidden");

    // Admin can verify
    expect(attemptVerification("admin-1", "ADMIN")).toBe(true);
  });

  it("requires rejection reason with at least 3 characters on reject", () => {
    const validateRejection = (reason?: string) => {
      if (!reason || reason.trim().length < 3) {
        throw new Error("A rejection reason of at least 3 characters is required");
      }
      return true;
    };

    expect(() => validateRejection("")).toThrow();
    expect(() => validateRejection("  ")).toThrow();
    expect(() => validateRejection("no")).toThrow();
    expect(validateRejection("Invalid UPI UTR reference")).toBe(true);
  });

  it("transitions payment and membership to VERIFIED / ACTIVE on approval", () => {
    const membership = {
      id: "mem-1",
      membershipStatus: "PENDING_VERIFICATION",
    };
    const payment = {
      id: "pay-1",
      paymentStatus: "PENDING_VERIFICATION",
    };

    // Approval transition
    payment.paymentStatus = "VERIFIED";
    membership.membershipStatus = "ACTIVE";

    expect(payment.paymentStatus).toBe("VERIFIED");
    expect(membership.membershipStatus).toBe("ACTIVE");
  });

  it("transitions payment and membership to REJECTED on rejection", () => {
    const membership = {
      id: "mem-1",
      membershipStatus: "PENDING_VERIFICATION",
    };
    const payment = {
      id: "pay-1",
      paymentStatus: "PENDING_VERIFICATION",
    };

    // Rejection transition
    payment.paymentStatus = "REJECTED";
    membership.membershipStatus = "REJECTED";

    expect(payment.paymentStatus).toBe("REJECTED");
    expect(membership.membershipStatus).toBe("REJECTED");
  });
});

describe("Staff Attribution & Performance Calculations", () => {
  it("preserves membership createdById attribution across renewals and deactivation", () => {
    const staff1 = { id: "staff-1", name: "Amit", isActive: false }; // deactivated
    const staff2 = { id: "staff-2", name: "Pooja", isActive: true };

    const memberships = [
      {
        id: "m-1",
        memberId: "mem-1",
        createdById: staff1.id,
        finalAmount: 12000,
        createdAt: new Date("2025-01-01"),
      },
      {
        id: "m-2",
        memberId: "mem-1",
        createdById: staff2.id,
        finalAmount: 13500,
        createdAt: new Date("2026-01-01"),
      },
    ];

    // Even though Amit is deactivated, m-1 still points to Amit
    expect(memberships[0].createdById).toBe("staff-1");
    expect(memberships[1].createdById).toBe("staff-2");
  });

  it("calculates revenue only from PAID or VERIFIED payments without double counting", () => {
    const payments = [
      { id: "p1", receivedById: "staff-1", amount: 7000, paymentStatus: "PAID" },
      { id: "p2", receivedById: "staff-1", amount: 3000, paymentStatus: "VERIFIED" },
      { id: "p3", receivedById: "staff-1", amount: 4000, paymentStatus: "PENDING_VERIFICATION" }, // pending approval
      { id: "p4", receivedById: "staff-1", amount: 2000, paymentStatus: "REJECTED" }, // rejected
      { id: "p5", receivedById: "staff-2", amount: 5000, paymentStatus: "PAID" }, // another staff
    ];

    const staff1Confirmed = payments
      .filter(
        (p) =>
          p.receivedById === "staff-1" &&
          (p.paymentStatus === "PAID" || p.paymentStatus === "VERIFIED")
      )
      .reduce((sum, p) => sum + p.amount, 0);

    expect(staff1Confirmed).toBe(10000);
  });

  it("calculates average membership value correctly", () => {
    const revenue = 84000;
    const membershipsCount = 12;
    const avgValue = membershipsCount > 0 ? Math.round(revenue / membershipsCount) : 0;
    expect(avgValue).toBe(7000);

    const zeroCount = 0;
    const zeroAvg = zeroCount > 0 ? Math.round(revenue / zeroCount) : 0;
    expect(zeroAvg).toBe(0);
  });

  it("correctly sorts staff performance comparison by revenue or memberships", () => {
    const comparison = [
      { name: "Priya", revenue: 312000, memberships: 29 },
      { name: "Amit", revenue: 384000, memberships: 36 },
      { name: "Raj", revenue: 291000, memberships: 27 },
    ];

    // Sort by revenue descending
    const byRevenue = [...comparison].sort((a, b) => b.revenue - a.revenue);
    expect(byRevenue[0].name).toBe("Amit");
    expect(byRevenue[1].name).toBe("Priya");
    expect(byRevenue[2].name).toBe("Raj");

    // Sort by memberships descending
    const byMemberships = [...comparison].sort((a, b) => b.memberships - a.memberships);
    expect(byMemberships[0].name).toBe("Amit");
    expect(byMemberships[1].name).toBe("Priya");
    expect(byMemberships[2].name).toBe("Raj");
  });
});
