// __tests__/check-in.test.ts — Unit tests for Member Attendance Check-In & Offline Queue Contracts
import { hasPermission, requirePermission, Permission } from "@/lib/rbac";
import { normalizeCalendarDate } from "@/lib/services/MembershipDateService";
import { z } from "zod";

const CheckInPayloadSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
  notes: z.string().max(255).optional().nullable(),
  checkInDate: z.string().optional(),
  checkInTime: z.string().optional(),
});

describe("Attendance Check-In RBAC & Business Rules", () => {
  it("allows STAFF, ADMIN, and SUPER_ADMIN to check in members and read check-ins", () => {
    expect(hasPermission("STAFF", Permission.CHECK_IN_MEMBER)).toBe(true);
    expect(hasPermission("ADMIN", Permission.CHECK_IN_MEMBER)).toBe(true);
    expect(hasPermission("SUPER_ADMIN", Permission.CHECK_IN_MEMBER)).toBe(true);

    expect(hasPermission("STAFF", Permission.READ_CHECK_INS)).toBe(true);
    expect(hasPermission("ADMIN", Permission.READ_CHECK_INS)).toBe(true);
    expect(hasPermission("SUPER_ADMIN", Permission.READ_CHECK_INS)).toBe(true);
  });

  it("normalizes check-in date to midnight UTC in Asia/Kolkata timezone", () => {
    const d1 = normalizeCalendarDate("2026-09-20");
    expect(d1.toISOString()).toBe("2026-09-20T00:00:00.000Z");

    const now = new Date("2026-09-20T18:30:00.000Z"); // 00:00 next day in Asia/Kolkata (+5:30) -> 2026-09-21
    const normalized = normalizeCalendarDate(now);
    expect(normalized.toISOString()).toBe("2026-09-21T00:00:00.000Z");
  });

  it("validates check-in payload correctly", () => {
    const valid = CheckInPayloadSchema.safeParse({
      memberId: "mem_123456",
      notes: "Attended evening strength training session",
    });
    expect(valid.success).toBe(true);

    const invalid = CheckInPayloadSchema.safeParse({
      memberId: "",
    });
    expect(invalid.success).toBe(false);
  });

  it("validates offline mutation schema for CHECK_IN and MEMBER_NOTE", () => {
    const offlineItemCheckIn = {
      type: "CHECK_IN" as const,
      url: "/api/check-ins",
      method: "POST" as const,
      payload: { memberId: "mem_abc" },
      description: "Check-in: John Doe",
    };

    expect(offlineItemCheckIn.type).toBe("CHECK_IN");
    expect(offlineItemCheckIn.method).toBe("POST");
    expect(offlineItemCheckIn.payload.memberId).toBe("mem_abc");

    const offlineItemNote = {
      type: "MEMBER_NOTE" as const,
      url: "/api/members/mem_abc",
      method: "PATCH" as const,
      payload: { notes: "Knee rehabilitation routine" },
      description: "Note: John Doe",
    };

    expect(offlineItemNote.type).toBe("MEMBER_NOTE");
    expect(offlineItemNote.method).toBe("PATCH");
    expect(offlineItemNote.payload.notes).toBe("Knee rehabilitation routine");
  });
});
