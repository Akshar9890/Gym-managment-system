// __tests__/lifecycle-service.test.ts — Unit tests for MembershipLifecycleService

import { determineMembershipStatus } from "@/lib/services/MembershipLifecycleService";
import { MembershipStatus } from "@prisma/client";

describe("MembershipLifecycleService determineMembershipStatus", () => {
  const refDate = new Date("2026-09-11"); // Reference today

  test("Returns ACTIVE when > 10 days remaining", () => {
    const start = new Date("2026-09-01");
    const end = new Date("2026-09-25"); // 14 days left
    const status = determineMembershipStatus(start, end, MembershipStatus.ACTIVE, refDate);
    expect(status).toBe(MembershipStatus.ACTIVE);
  });

  test("Returns EXPIRING_SOON when exactly 10 days remaining", () => {
    const start = new Date("2026-08-22");
    const end = new Date("2026-09-21"); // exactly 10 days left
    const status = determineMembershipStatus(start, end, MembershipStatus.ACTIVE, refDate);
    expect(status).toBe(MembershipStatus.EXPIRING_SOON);
  });

  test("Returns EXPIRING_SOON when 1 day remaining", () => {
    const start = new Date("2026-08-12");
    const end = new Date("2026-09-12"); // 1 day left
    const status = determineMembershipStatus(start, end, MembershipStatus.ACTIVE, refDate);
    expect(status).toBe(MembershipStatus.EXPIRING_SOON);
  });

  test("Returns EXPIRING_SOON when expires today (0 days left)", () => {
    const start = new Date("2026-08-11");
    const end = new Date("2026-09-11"); // 0 days left
    const status = determineMembershipStatus(start, end, MembershipStatus.EXPIRING_SOON, refDate);
    expect(status).toBe(MembershipStatus.EXPIRING_SOON);
  });

  test("Returns EXPIRED when 1 day past end date", () => {
    const start = new Date("2026-08-10");
    const end = new Date("2026-09-10"); // -1 day left
    const status = determineMembershipStatus(start, end, MembershipStatus.EXPIRING_SOON, refDate);
    expect(status).toBe(MembershipStatus.EXPIRED);
  });

  test("Preserves CANCELLED status even if date is active", () => {
    const start = new Date("2026-09-01");
    const end = new Date("2026-10-01");
    const status = determineMembershipStatus(start, end, MembershipStatus.CANCELLED, refDate);
    expect(status).toBe(MembershipStatus.CANCELLED);
  });

  test("Preserves CANCELLED status even when date has EXPIRED (< 0 days left)", () => {
    const start = new Date("2026-07-01");
    const end = new Date("2026-08-01"); // Expired over a month ago
    const status = determineMembershipStatus(start, end, MembershipStatus.CANCELLED, refDate);
    expect(status).toBe(MembershipStatus.CANCELLED);
  });

  test("Preserves PAUSED status even if date is active", () => {
    const start = new Date("2026-09-01");
    const end = new Date("2026-10-01");
    const status = determineMembershipStatus(start, end, MembershipStatus.PAUSED, refDate);
    expect(status).toBe(MembershipStatus.PAUSED);
  });

  test("Preserves PAUSED status even when date has passed", () => {
    const start = new Date("2026-07-01");
    const end = new Date("2026-08-01");
    const status = determineMembershipStatus(start, end, MembershipStatus.PAUSED, refDate);
    expect(status).toBe(MembershipStatus.PAUSED);
  });

  test("Consecutive runs: CANCELLED and PAUSED remain untouched across multiple days", () => {
    const start = new Date("2026-09-01");
    const end = new Date("2026-09-21"); // would normally be EXPIRING_SOON

    // Day 1
    const day1 = new Date("2026-09-11");
    const s1Cancelled = determineMembershipStatus(start, end, MembershipStatus.CANCELLED, day1);
    const s1Paused = determineMembershipStatus(start, end, MembershipStatus.PAUSED, day1);
    expect(s1Cancelled).toBe(MembershipStatus.CANCELLED);
    expect(s1Paused).toBe(MembershipStatus.PAUSED);

    // Day 2 (consecutive run)
    const day2 = new Date("2026-09-12");
    const s2Cancelled = determineMembershipStatus(start, end, s1Cancelled, day2);
    const s2Paused = determineMembershipStatus(start, end, s1Paused, day2);
    expect(s2Cancelled).toBe(MembershipStatus.CANCELLED);
    expect(s2Paused).toBe(MembershipStatus.PAUSED);

    // Day 3 (after expiry date)
    const day3 = new Date("2026-09-25");
    const s3Cancelled = determineMembershipStatus(start, end, s2Cancelled, day3);
    const s3Paused = determineMembershipStatus(start, end, s2Paused, day3);
    expect(s3Cancelled).toBe(MembershipStatus.CANCELLED);
    expect(s3Paused).toBe(MembershipStatus.PAUSED);
  });

  test("Returns ACTIVE instead of EXPIRING_SOON when member has paid in advance (subsequent active renewal)", () => {
    const start = new Date("2026-08-22");
    const end = new Date("2026-09-21"); // exactly 10 days left
    // Without advance renewal -> EXPIRING_SOON
    const normalStatus = determineMembershipStatus(start, end, MembershipStatus.ACTIVE, refDate, false);
    expect(normalStatus).toBe(MembershipStatus.EXPIRING_SOON);

    // With advance renewal -> ACTIVE
    const renewedStatus = determineMembershipStatus(start, end, MembershipStatus.ACTIVE, refDate, true);
    expect(renewedStatus).toBe(MembershipStatus.ACTIVE);
  });
});

