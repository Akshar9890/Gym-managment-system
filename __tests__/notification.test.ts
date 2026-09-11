// __tests__/notification.test.ts — Unit tests for WhatsApp provider and notification logic

import { DevWhatsAppProvider } from "@/lib/whatsapp/DevWhatsAppProvider";

describe("DevWhatsAppProvider (DECISIONS.md D5)", () => {
  const provider = new DevWhatsAppProvider();

  test("isDevMode() returns true", () => {
    expect(provider.isDevMode()).toBe(true);
  });

  test("sendMessage with valid Indian number returns SIMULATED status", async () => {
    const result = await provider.sendMessage("9876543210", "Hello BSF member!");
    expect(result.success).toBe(true);
    expect(result.status).toBe("SIMULATED");
    expect(result.providerMessageId).toMatch(/^DEV-\d+-[a-z0-9]+$/);
  });

  test("sendMessage with invalid number fails", async () => {
    const result = await provider.sendMessage("12345", "Test");
    expect(result.success).toBe(false);
    expect(result.status).toBe("FAILED");
  });

  test("sendTemplateMessage returns SIMULATED status with template ID", async () => {
    const result = await provider.sendTemplateMessage(
      "9876543210",
      "membership_expiry_10_days",
      { member_name: "Rahul", plan_name: "Monthly", expiry_date: "10 Oct 2026", days_remaining: "10" }
    );
    expect(result.success).toBe(true);
    expect(result.status).toBe("SIMULATED");
    expect(result.providerMessageId).toMatch(/^DEV-TPL-\d+-[a-z0-9]+$/);
  });
});
