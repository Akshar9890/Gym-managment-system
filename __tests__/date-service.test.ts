// __tests__/date-service.test.ts — Unit tests for MembershipDateService (D1 verification)

import {
  calculateEndDate,
  calculateRenewalStartDate,
  getDaysUntilExpiry,
  normalizeCalendarDate,
} from "@/lib/services/MembershipDateService";

describe("MembershipDateService (D1 Policy)", () => {
  describe("DECISIONS.md D1 Examples", () => {
    test("11 Sep 2026 + 1 Month -> 10 Oct 2026", () => {
      const end = calculateEndDate(new Date("2026-09-11"), { durationMonths: 1 });
      expect(end.toISOString().startsWith("2026-10-10")).toBe(true);
    });

    test("11 Sep 2026 + 3 Months -> 10 Dec 2026", () => {
      const end = calculateEndDate(new Date("2026-09-11"), { durationMonths: 3 });
      expect(end.toISOString().startsWith("2026-12-10")).toBe(true);
    });

    test("11 Sep 2026 + 6 Months -> 10 Mar 2027", () => {
      const end = calculateEndDate(new Date("2026-09-11"), { durationMonths: 6 });
      expect(end.toISOString().startsWith("2027-03-10")).toBe(true);
    });

    test("11 Sep 2026 + 1 Year (12 Months) -> 10 Sep 2027", () => {
      const end = calculateEndDate(new Date("2026-09-11"), { durationMonths: 12 });
      expect(end.toISOString().startsWith("2027-09-10")).toBe(true);
    });
  });

  describe("Renewal Continuity", () => {
    test("Renewal starts exactly previous endDate + 1 day", () => {
      const firstEnd = calculateEndDate(new Date("2026-09-11"), { durationMonths: 1 }); // 2026-10-10
      const renewalStart = calculateRenewalStartDate(firstEnd);
      expect(renewalStart.toISOString().startsWith("2026-10-11")).toBe(true);

      const renewalEnd = calculateEndDate(renewalStart, { durationMonths: 1 }); // 2026-11-10
      expect(renewalEnd.toISOString().startsWith("2026-11-10")).toBe(true);
    });
  });

  describe("Month-end and Leap Year Edge Cases", () => {
    test("31 Jan 2027 + 1 Month (non-leap) -> Feb 28 minus 1 day = 27 Feb 2027", () => {
      const end = calculateEndDate(new Date("2027-01-31"), { durationMonths: 1 });
      expect(end.toISOString().startsWith("2027-02-27")).toBe(true);
    });

    test("31 Jan 2028 + 1 Month (leap year) -> Feb 29 minus 1 day = 28 Feb 2028", () => {
      const end = calculateEndDate(new Date("2028-01-31"), { durationMonths: 1 });
      expect(end.toISOString().startsWith("2028-02-28")).toBe(true);
    });

    test("Plan with durationDays only (e.g. 15-day pass)", () => {
      const end = calculateEndDate(new Date("2026-09-11"), { durationMonths: 0, durationDays: 15 });
      // 11 Sep + 15 days = 26 Sep - 1 day = 25 Sep
      expect(end.toISOString().startsWith("2026-09-25")).toBe(true);
    });
  });

  describe("getDaysUntilExpiry", () => {
    test("Returns positive for future date", () => {
      const today = new Date("2026-09-11");
      const end = new Date("2026-09-21");
      expect(getDaysUntilExpiry(end, today)).toBe(10);
    });

    test("Returns 0 for today", () => {
      const today = new Date("2026-09-11");
      expect(getDaysUntilExpiry(today, today)).toBe(0);
    });

    test("Returns negative for expired date", () => {
      const today = new Date("2026-09-11");
      const end = new Date("2026-09-06");
      expect(getDaysUntilExpiry(end, today)).toBe(-5);
    });
  });
});
