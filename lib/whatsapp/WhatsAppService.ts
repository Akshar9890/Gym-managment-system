// lib/whatsapp/WhatsAppService.ts — Provider interface (per ARCHITECTURE.md §4)
// All WhatsApp sends go through this interface, never directly through a vendor SDK.
// Provider is selected by WHATSAPP_PROVIDER env var.

import { SendResult, MessageStatus, TemplateVariables } from "./types";

/**
 * WhatsApp service interface.
 * Concrete implementations:
 *   - DevWhatsAppProvider    (dev/test — logs simulated sends, clearly labeled)
 *   - WhatsAppBusinessProvider (production — Phase 9)
 */
export interface IWhatsAppService {
  /**
   * Send a free-form text message.
   * Only use for admin alerts, not member reminders (use templates for those).
   */
  sendMessage(to: string, body: string): Promise<SendResult>;

  /**
   * Send a pre-approved WhatsApp template message.
   * Template: 'membership_expiry_10_days'
   * Variables: {{member_name}}, {{plan_name}}, {{expiry_date}}, {{days_remaining}}
   */
  sendTemplateMessage(
    to: string,
    template: string,
    variables: TemplateVariables
  ): Promise<SendResult>;

  /**
   * Get the delivery status of a previously sent message.
   */
  getMessageStatus(providerMessageId: string): Promise<MessageStatus>;

  /**
   * Returns true if this is a simulated (dev) provider.
   * Used by the UI to display the "Development Mode" indicator.
   */
  isDevMode(): boolean;
}

/**
 * Factory: returns the configured WhatsApp provider.
 * Defaults to DevWhatsAppProvider if WHATSAPP_PROVIDER=dev or credentials are missing.
 * NEVER exposes credentials to client code.
 */
export async function getWhatsAppService(): Promise<IWhatsAppService> {
  const provider = process.env.WHATSAPP_PROVIDER ?? "dev";

  if (
    provider === "dev" ||
    !process.env.WHATSAPP_ACCESS_TOKEN ||
    !process.env.WHATSAPP_PHONE_NUMBER_ID
  ) {
    const { DevWhatsAppProvider } = await import("./DevWhatsAppProvider");
    return new DevWhatsAppProvider();
  }

  // Phase 9: production provider
  const { WhatsAppBusinessProvider } = await import(
    "./WhatsAppBusinessProvider"
  );
  return new WhatsAppBusinessProvider({
    apiUrl: process.env.WHATSAPP_API_URL!,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
  });
}
