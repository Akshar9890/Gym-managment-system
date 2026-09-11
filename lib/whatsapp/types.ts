// lib/whatsapp/types.ts — WhatsApp provider types

export interface SendResult {
  success: boolean;
  providerMessageId?: string;
  status: "SENT" | "FAILED" | "SIMULATED";
  errorMessage?: string;
  simulatedAt?: Date;
}

export interface MessageStatus {
  providerMessageId: string;
  status: "DELIVERED" | "READ" | "SENT" | "FAILED" | "PENDING" | "UNKNOWN";
  timestamp?: Date;
  errorCode?: string;
}

export interface TemplateVariables {
  [key: string]: string;
}
