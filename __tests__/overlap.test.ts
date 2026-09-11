// __tests__/overlap.test.ts — Unit tests for membership date overlap enforcement (Rule 3)

import { areIntervalsOverlapping } from "@/lib/services/MembershipDateService";

describe("Membership Date Overlap Enforcement (Rule 3)", () => {
  test("Detects identical period overlap", () => {
    // Both 11 Sep 2026 to 10 Oct 2026
    const overlap = areIntervalsOverlapping(
      "2026-09-11", "2026-10-10",
      "2026-09-11", "2026-10-10"
    );
    expect(overlap).toBe(true);
  });

  test("Detects partial inside overlap", () => {
    // A: 11 Sep to 10 Dec. B: 01 Oct to 31 Oct.
    const overlap = areIntervalsOverlapping(
      "2026-09-11", "2026-12-10",
      "2026-10-01", "2026-10-31"
    );
    expect(overlap).toBe(true);
  });

  test("Detects partial boundary overlap (same day boundary)", () => {
    // A ends 10 Oct. B starts 10 Oct.
    const overlap = areIntervalsOverlapping(
      "2026-09-11", "2026-10-10",
      "2026-10-10", "2026-11-09"
    );
    expect(overlap).toBe(true);
  });

  test("Allows consecutive periods with +1 day renewal continuity (no overlap)", () => {
    // Period A: 11 Sep 2026 to 10 Oct 2026
    // Period B: 11 Oct 2026 to 10 Nov 2026
    const overlap = areIntervalsOverlapping(
      "2026-09-11", "2026-10-10",
      "2026-10-11", "2026-11-10"
    );
    expect(overlap).toBe(false);
  });

  test("Allows non-adjacent future periods (gap)", () => {
    // Period A: Jan 2026. Period B: Mar 2026.
    const overlap = areIntervalsOverlapping(
      "2026-01-01", "2026-01-31",
      "2026-03-01", "2026-03-31"
    );
    expect(overlap).toBe(false);
  });
});
