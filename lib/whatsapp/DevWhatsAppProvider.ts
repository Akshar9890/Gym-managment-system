// lib/whatsapp/DevWhatsAppProvider.ts — Development WhatsApp provider
// Per DECISIONS.md D5: clearly labeled simulated sends, never claims delivery.
// When WHATSAPP_PROVIDER=dev or credentials are absent, this is the active provider.

import { IWhatsAppService } from "./WhatsAppService";
import { SendResult, MessageStatus, TemplateVariables } from "./types";
import { isValidIndianPhone, normalizeIndianPhone } from "@/lib/validation/indian-phone";

export class DevWhatsAppProvider implements IWhatsAppService {
  /**
   * Simulates sending a WhatsApp message.
   * Logs to console with clear [DEV WHATSAPP] prefix.
   * Returns SIMULATED status — NEVER claims actual delivery.
   */
  async sendMessage(to: string, body: string): Promise<SendResult> {
    const normalized = normalizeIndianPhone(to);
    if (!normalized) {
      return {
        success: false,
        status: "FAILED",
        errorMessage: `Invalid WhatsApp number: '${to}'. Must be a valid Indian mobile number.`,
      };
    }

    const simId = `DEV-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    console.log(
      `\n[DEV WHATSAPP] ⚠️  DEVELOPMENT MODE — MESSAGE NOT ACTUALLY SENT\n` +
      `  To:      +91${normalized}\n` +
      `  Body:    ${body.slice(0, 120)}${body.length > 120 ? "…" : ""}\n` +
      `  Sim ID:  ${simId}\n` +
      `  Status:  SIMULATED (no real WhatsApp delivery)\n`
    );

    return {
      success: true,
      providerMessageId: simId,
      status: "SIMULATED",
      simulatedAt: new Date(),
    };
  }

  /**
   * Simulates sending a WhatsApp template message.
   */
  async sendTemplateMessage(
    to: string,
    template: string,
    variables: TemplateVariables
  ): Promise<SendResult> {
    const normalized = normalizeIndianPhone(to);
    if (!normalized) {
      return {
        success: false,
        status: "FAILED",
        errorMessage: `Invalid WhatsApp number: '${to}'.`,
      };
    }

    const simId = `DEV-TPL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    console.log(
      `\n[DEV WHATSAPP] ⚠️  DEVELOPMENT MODE — TEMPLATE NOT ACTUALLY SENT\n` +
      `  To:        +91${normalized}\n` +
      `  Template:  ${template}\n` +
      `  Variables: ${JSON.stringify(variables)}\n` +
      `  Sim ID:    ${simId}\n` +
      `  Status:    SIMULATED (no real WhatsApp delivery)\n`
    );

    return {
      success: true,
      providerMessageId: simId,
      status: "SIMULATED",
      simulatedAt: new Date(),
    };
  }

  /**
   * Returns a simulated status for dev message IDs.
   */
  async getMessageStatus(providerMessageId: string): Promise<MessageStatus> {
    return {
      providerMessageId,
      status: "UNKNOWN",
      // Dev provider cannot check real status
    };
  }

  isDevMode(): boolean {
    return true;
  }
}
