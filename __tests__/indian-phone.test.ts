// __tests__/indian-phone.test.ts — Indian phone validation tests (Phase 1)

import { isValidIndianPhone, normalizeIndianPhone } from "@/lib/validation/indian-phone";

describe("Indian phone number validation", () => {
  describe("valid numbers", () => {
    const validNumbers = [
      "9876543210",
      "8765432109",
      "7654321098",
      "6543210987",
      "+919876543210",
      "919876543210",
      "98765 43210",
      "98765-43210",
      "09033465920",
    ];

    test.each(validNumbers)("accepts %s", (number) => {
      expect(isValidIndianPhone(number)).toBe(true);
    });
  });

  describe("invalid numbers", () => {
    const invalidNumbers = [
      "1234567890",  // starts with 1
      "5876543210",  // starts with 5
      "12345",       // too short
      "98765432101", // too long (11 digits)
      "",
      "abcdefghij",
      "+44 20 7946 0958", // UK number
    ];

    test.each(invalidNumbers)("rejects %s", (number) => {
      expect(isValidIndianPhone(number)).toBe(false);
    });
  });

  describe("normalization", () => {
    test("strips +91 prefix", () => {
      expect(normalizeIndianPhone("+919876543210")).toBe("9876543210");
    });

    test("strips 91 prefix for 12-digit numbers", () => {
      expect(normalizeIndianPhone("919876543210")).toBe("9876543210");
    });

    test("strips spaces and hyphens", () => {
      expect(normalizeIndianPhone("98765 43210")).toBe("9876543210");
      expect(normalizeIndianPhone("98765-43210")).toBe("9876543210");
    });

    test("returns null for invalid numbers", () => {
      expect(normalizeIndianPhone("12345")).toBeNull();
      expect(normalizeIndianPhone("")).toBeNull();
    });
  });
});
