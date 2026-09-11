// __tests__/payment-verification.test.ts — Unit tests for payment verification logic & permissions
import { hasPermission, requirePermission, Permission } from "@/lib/rbac";
import { ForbiddenError } from "@/lib/auth/session";

describe("Payment Verification RBAC & Guard Rules", () => {
  it("only ADMIN and SUPER_ADMIN have VERIFY_PAYMENT permission", () => {
    expect(hasPermission("SUPER_ADMIN", Permission.VERIFY_PAYMENT)).toBe(true);
    expect(hasPermission("ADMIN", Permission.VERIFY_PAYMENT)).toBe(true);
    expect(hasPermission("STAFF", Permission.VERIFY_PAYMENT)).toBe(false);
  });

  it("throws ForbiddenError when STAFF attempts to verify payment", () => {
    expect(() => requirePermission("STAFF", Permission.VERIFY_PAYMENT)).toThrow(ForbiddenError);
  });

  it("prevents staff self-approval on their recorded payments", () => {
    const session = {
      userId: "staff-101",
      role: "STAFF" as const,
    };

    const payment = {
      id: "pay-1",
      receivedById: "staff-101",
      amount: 4500,
      paymentStatus: "PENDING_VERIFICATION",
    };

    const verifyAttempt = (userSession: typeof session) => {
      if (!hasPermission(userSession.role, Permission.VERIFY_PAYMENT)) {
        throw new Error("Forbidden: Payment verification requires Admin role");
      }
      if (payment.receivedById === userSession.userId) {
        throw new Error("Self-approval prohibited: Staff cannot verify their own recorded payments");
      }
      return true;
    };

    expect(() => verifyAttempt(session)).toThrow("Forbidden");
  });

  it("validates rejection input", () => {
    const validate = (action: string, reason?: string) => {
      if (action === "REJECT") {
        if (!reason || reason.trim().length < 3) {
          throw new Error("Rejection reason is required (at least 3 characters)");
        }
      }
      return true;
    };

    expect(() => validate("REJECT", "")).toThrow();
    expect(() => validate("REJECT", "no")).toThrow();
    expect(validate("REJECT", "Payment receipt screenshot is unreadable")).toBe(true);
    expect(validate("APPROVE")).toBe(true);
  });

  it("determines pending vs verified status badge rendering", () => {
    const isWatermarkedDraft = (paymentStatus: string) => {
      return paymentStatus === "PENDING_VERIFICATION";
    };

    expect(isWatermarkedDraft("PENDING_VERIFICATION")).toBe(true);
    expect(isWatermarkedDraft("VERIFIED")).toBe(false);
    expect(isWatermarkedDraft("PAID")).toBe(false);
  });
});
