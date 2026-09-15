// lib/receipt-whatsapp.ts — Shared utility to open direct WhatsApp chat with member and auto-download receipt PDF
import { format } from "date-fns";
import { generateReceiptPDF } from "@/lib/receipt-pdf";
import { ReceiptData } from "@/components/payments/ReceiptModal";

/**
 * Normalizes an Indian phone number to international format without plus or spaces (e.g. 917016312828).
 */
export function normalizeIndianWhatsAppNumber(phone: string): string {
  const digitsOnly = (phone || "").replace(/\D/g, "");
  if (digitsOnly.length === 10) {
    return `91${digitsOnly}`;
  }
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    return digitsOnly;
  }
  return `91${digitsOnly.slice(-10)}`;
}

/**
 * Downloads the PDF receipt and opens direct WhatsApp chat with the member's number.
 * Returns the normalized phone number for notification/UI feedback.
 */
export function sendReceiptViaWhatsApp(receipt: ReceiptData): string {
  // 1. Generate & download receipt PDF
  const doc = generateReceiptPDF(receipt);
  const fileName = `BSF-Receipt-${receipt.receiptNumber}.pdf`;
  try {
    doc.save(fileName);
  } catch (e) {
    console.warn("PDF auto-download error", e);
  }

  // 2. Resolve phone number (prioritize whatsappNumber)
  const rawPhone = receipt.member.whatsappNumber || receipt.member.phoneNumber || "";
  const normalizedPhone = normalizeIndianWhatsAppNumber(rawPhone);

  // 3. Format dates cleanly
  let formattedDate = receipt.paymentDate;
  let formattedStart = receipt.membership.startDate;
  let formattedEnd = receipt.membership.endDate;
  try {
    formattedDate = format(new Date(receipt.paymentDate), "dd MMM yyyy, hh:mm a");
    formattedStart = format(new Date(receipt.membership.startDate), "dd MMM yyyy");
    formattedEnd = format(new Date(receipt.membership.endDate), "dd MMM yyyy");
  } catch {}

  const balanceDue = Math.max(0, receipt.membership.balanceDue);

  // 4. Pre-fill official WhatsApp receipt message
  const msg =
    `*BSF THE GYM — Official Payment Receipt #${receipt.receiptNumber}* 🧾\n` +
    `_Gotri-Sevasi Road, Vadodara, Gujarat_\n\n` +
    `Hi *${receipt.member.fullName}*,\n` +
    `Here is your official payment receipt for your *${receipt.membership.planName}* membership at BSF THE GYM.\n\n` +
    `• *Receipt No:* #${receipt.receiptNumber}\n` +
    `• *Date:* ${formattedDate}\n` +
    `• *Plan:* ${receipt.membership.planName} (${formattedStart} to ${formattedEnd})\n` +
    `• *Amount Paid:* ₹${receipt.amount.toLocaleString("en-IN")} (${receipt.paymentMethod})\n` +
    `• *Balance Due:* ₹${balanceDue.toLocaleString("en-IN")}\n\n` +
    `*(Your official receipt PDF has been downloaded. Please find the attached document.)*\n\n` +
    `Thank you for working out with *BSF THE GYM*! Stay fit, stay strong. 💪🏋️‍♂️`;

  // 5. Open direct WhatsApp chat with the member's phone number
  const waUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, "_blank", "noopener,noreferrer");

  return normalizedPhone;
}
