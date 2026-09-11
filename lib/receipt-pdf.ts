// lib/receipt-pdf.ts — Vector PDF generation for BSF THE GYM Payment Receipts
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { ReceiptData } from "@/components/payments/ReceiptModal";

export function generateReceiptPDF(receipt: ReceiptData): jsPDF {
  // A5 size: 148mm x 210mm (clean voucher size)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a5",
  });

  const pageWidth = 148;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  // Header Background bar
  doc.setFillColor(17, 19, 22);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, "F");

  // Gym Name Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(245, 158, 11); // Amber
  doc.text("BSF THE GYM", pageWidth / 2, y + 8, { align: "center" });

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(220, 220, 220);
  doc.text("FITNESS & STRENGTH CLUB", pageWidth / 2, y + 13, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text("Gotri-Sevasi Road, Vadodara, Gujarat 390021  •  +91 98250 00000", pageWidth / 2, y + 18, { align: "center" });

  y += 30;

  // Receipt Title & Badge
  const isPending = receipt.isPending || receipt.paymentStatus === "PENDING_VERIFICATION";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(isPending ? 9.5 : 11);
  doc.setTextColor(isPending ? 180 : 20, isPending ? 83 : 20, isPending ? 9 : 20); // Amber if pending
  doc.text(isPending ? "DRAFT RECEIPT — PENDING ADMIN VERIFICATION" : "OFFICIAL PAYMENT RECEIPT", margin, y);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 90, 90);
  const formattedDate = format(new Date(receipt.paymentDate), "dd MMM yyyy, hh:mm a");
  doc.text(formattedDate, pageWidth - margin, y, { align: "right" });

  y += 3;
  // Dashed divider
  doc.setDrawColor(180, 180, 180);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setLineDashPattern([], 0); // Reset dash

  y += 7;

  // Receipt Meta Grid Box
  doc.setFillColor(248, 249, 250);
  doc.setDrawColor(225, 228, 232);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, "FD");

  // Col 1: Member Info
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(110, 110, 110);
  doc.text("MEMBER DETAILS", margin + 4, y + 6);

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text(receipt.member.fullName, margin + 4, y + 12);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Phone: +91 ${receipt.member.phoneNumber}`, margin + 4, y + 17);
  if (receipt.member.email) {
    doc.text(receipt.member.email, margin + 4, y + 22);
  }

  // Col 2: Receipt Info
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(110, 110, 110);
  doc.text("RECEIPT NO", pageWidth - margin - 4, y + 6, { align: "right" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(217, 119, 6); // Amber dark
  doc.text(`#${receipt.receiptNumber}`, pageWidth - margin - 4, y + 12, { align: "right" });

  if (receipt.membership.membershipReference) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Ref: ${receipt.membership.membershipReference}`, pageWidth - margin - 4, y + 17, { align: "right" });
  }

  y += 32;

  // Membership Validity Block
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(110, 110, 110);
  doc.text("ITEM DESCRIPTION", margin, y);
  doc.text("VALIDITY PERIOD", pageWidth - margin, y, { align: "right" });

  y += 2;
  doc.setDrawColor(210, 215, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text(`${receipt.membership.planName} Membership`, margin, y);

  const formattedStart = format(new Date(receipt.membership.startDate), "dd MMM yyyy");
  const formattedEnd = format(new Date(receipt.membership.endDate), "dd MMM yyyy");
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  doc.text(`${formattedStart} to ${formattedEnd}`, pageWidth - margin, y, { align: "right" });

  y += 4;
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text("Full Gym Floor Access & Strength Equipment", margin, y);

  y += 7;

  // Financial Breakdown Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(220, 225, 230);
  doc.roundedRect(margin, y, contentWidth, 48, 2, 2, "D");

  let fy = y + 7;
  const leftX = margin + 5;
  const rightX = pageWidth - margin - 5;

  // Standard Fee
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 90, 90);
  doc.text("Plan Standard Fee:", leftX, fy);
  doc.text(`INR ${receipt.membership.priceAtPurchase.toLocaleString("en-IN")}`, rightX, fy, { align: "right" });

  // Discount (if any)
  if (receipt.membership.discount > 0) {
    fy += 5.5;
    doc.setTextColor(16, 149, 110); // Green
    doc.text("Special Discount Applied:", leftX, fy);
    doc.text(`- INR ${receipt.membership.discount.toLocaleString("en-IN")}`, rightX, fy, { align: "right" });
  }

  // Net Plan Amount
  fy += 5.5;
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.text("Net Total Amount:", leftX, fy);
  doc.text(`INR ${receipt.membership.finalAmount.toLocaleString("en-IN")}`, rightX, fy, { align: "right" });

  // Highlight Box: Amount Paid
  fy += 4;
  doc.setFillColor(254, 243, 199); // Amber tint
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(leftX, fy, contentWidth - 10, 9, 1.5, 1.5, "FD");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(146, 64, 14); // Dark amber
  doc.text("AMOUNT PAID THIS RECEIPT:", leftX + 4, fy + 6);
  doc.text(`INR ${receipt.amount.toLocaleString("en-IN")}`, rightX - 4, fy + 6, { align: "right" });

  // Mode & Remaining Balance
  fy += 14;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Payment Mode:", leftX, fy);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text(receipt.paymentMethod.toUpperCase(), leftX + 26, fy);

  const balanceDue = Math.max(0, receipt.membership.balanceDue);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Remaining Balance Due:", rightX - 35, fy, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setTextColor(balanceDue > 0 ? 185 : 16, balanceDue > 0 ? 28 : 149, balanceDue > 0 ? 28 : 110);
  doc.text(`INR ${balanceDue.toLocaleString("en-IN")}`, rightX, fy, { align: "right" });

  y += 56;

  // Signatures
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Processed By: ${receipt.receivedBy?.name || "BSF Front Desk"}`, margin, y);

  doc.text("Authorized Signature:", pageWidth - margin - 40, y);
  doc.setDrawColor(180, 180, 180);
  doc.line(pageWidth - margin - 40, y + 8, pageWidth - margin, y + 8);

  y += 16;

  // Footer note
  doc.setDrawColor(230, 230, 230);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(130, 130, 130);
  doc.text("*** Thank you for working out with BSF THE GYM! Stay fit, stay strong. ***", pageWidth / 2, y, { align: "center" });

  return doc;
}
