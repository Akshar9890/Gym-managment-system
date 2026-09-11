// lib/utils.ts — Shared utility functions

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { MembershipStatus, PaymentStatus } from "@prisma/client";

/** Merges class names with Tailwind conflict resolution */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format Indian Rupee amounts */
export function formatCurrency(amount: number | string | { toString(): string }): string {
  const num = typeof amount === "number" ? amount : parseFloat(amount.toString());
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

/** Format dates for display in India (DD MMM YYYY) */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

/** Format dates with day-of-week */
export function formatDateLong(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

/** Format datetime with time */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

/** Get membership status badge color class */
export function getMembershipStatusClass(status: MembershipStatus): string {
  switch (status) {
    case "ACTIVE": return "badge-active";
    case "PENDING_VERIFICATION": return "badge-pending";
    case "EXPIRING_SOON": return "badge-expiring";
    case "EXPIRED": return "badge-expired";
    case "REJECTED": return "badge-cancelled";
    case "CANCELLED": return "badge-cancelled";
    case "PAUSED": return "badge-paused";
    default: return "badge-cancelled";
  }
}

/** Get membership status label */
export function getMembershipStatusLabel(status: MembershipStatus): string {
  switch (status) {
    case "ACTIVE": return "Active";
    case "PENDING_VERIFICATION": return "Pending Verification";
    case "EXPIRING_SOON": return "Expiring Soon";
    case "EXPIRED": return "Expired";
    case "REJECTED": return "Rejected";
    case "CANCELLED": return "Cancelled";
    case "PAUSED": return "Paused";
    default: return status;
  }
}

/** Get payment status label */
export function getPaymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case "VERIFIED": return "Verified";
    case "PENDING_VERIFICATION": return "Pending Verification";
    case "PAID": return "Paid";
    case "PARTIAL": return "Partial";
    case "PENDING": return "Pending";
    case "REJECTED": return "Rejected";
    case "REFUNDED": return "Refunded";
    default: return status;
  }
}

/** Generates a BSF membership transaction reference (e.g. BSF-MEM-2026-000001) */
export function formatMembershipReference(year: number, sequence: number): string {
  return `BSF-MEM-${year}-${String(sequence).padStart(6, "0")}`;
}

/** Generates a receipt number (e.g. BSF-RCP-2026-000001) */
export function formatReceiptNumber(yearOrSequence: number, maybeSequence?: number): string {
  if (maybeSequence !== undefined) {
    return `BSF-RCP-${yearOrSequence}-${String(maybeSequence).padStart(6, "0")}`;
  }
  const currentYear = new Date().getFullYear();
  return `BSF-RCP-${currentYear}-${String(yearOrSequence).padStart(6, "0")}`;
}

/** Returns current date in Asia/Kolkata as a plain Date (midnight local time) */
export function todayInKolkata(): Date {
  const now = new Date();
  const kolkataStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return new Date(`${kolkataStr}T00:00:00.000Z`);
}
