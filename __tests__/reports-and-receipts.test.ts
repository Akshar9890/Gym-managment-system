// __tests__/reports-and-receipts.test.ts — Unit tests for reports, CSV formats, and receipt balances

describe("Receipt and Financial Calculations", () => {
  it("calculates balance due correctly when paid in full", () => {
    const finalAmount = 4000;
    const totalPaid = 4000;
    const balanceDue = Math.max(0, finalAmount - totalPaid);
    expect(balanceDue).toBe(0);
  });

  it("calculates partial payment balance due correctly", () => {
    const finalAmount = 7500;
    const totalPaid = 5000;
    const balanceDue = Math.max(0, finalAmount - totalPaid);
    expect(balanceDue).toBe(2500);
  });

  it("formats Indian Rupee correctly", () => {
    const formatter = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
    expect(formatter.format(13500)).toContain("13,500");
  });

  it("formats CSV row escaping quotes correctly", () => {
    const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;
    expect(escapeCsv('John "The Rock" Doe')).toBe('"John ""The Rock"" Doe"');
  });
});
