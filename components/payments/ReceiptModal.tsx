import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Printer, CheckCircle2, Dumbbell, Download, Share2, Copy, Check, ExternalLink, FileText, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { generateReceiptPDF } from "@/lib/receipt-pdf";
import { sendReceiptViaWhatsApp, normalizeIndianWhatsAppNumber } from "@/lib/receipt-whatsapp";

export interface ReceiptData {
  receiptNumber: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  paymentStatus?: string;
  isPending?: boolean;
  isVerified?: boolean;
  notes?: string | null;
  member: {
    fullName: string;
    phoneNumber: string;
    whatsappNumber?: string | null;
    email?: string | null;
  };
  membership: {
    membershipReference?: string;
    planName: string;
    startDate: string;
    endDate: string;
    priceAtPurchase: number;
    discount: number;
    finalAmount: number;
    paymentStatus: string;
    totalPaid: number;
    balanceDue: number;
  };
  receivedBy?: {
    name: string;
    role: string;
  } | null;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptData | null;
}

export function ReceiptModal({ isOpen, onClose, receipt }: ReceiptModalProps) {
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!receipt) return null;

  function handlePrint() {
    window.print();
  }

  const formattedDate = format(new Date(receipt.paymentDate), "dd MMM yyyy, hh:mm a");
  const formattedStart = format(new Date(receipt.membership.startDate), "dd MMM yyyy");
  const formattedEnd = format(new Date(receipt.membership.endDate), "dd MMM yyyy");

  function handleDownloadPDF() {
    if (!receipt) return;
    const doc = generateReceiptPDF(receipt);
    doc.save(`BSF-Receipt-${receipt.receiptNumber}.pdf`);
    setNotice("PDF receipt downloaded successfully!");
    setTimeout(() => setNotice(null), 3500);
  }

  function handleSharePDFWhatsApp() {
    if (!receipt) return;
    const normalizedPhone = sendReceiptViaWhatsApp(receipt);
    setNotice(`Direct WhatsApp opened for +${normalizedPhone}! Receipt PDF downloaded to your device.`);
    setTimeout(() => setNotice(null), 6000);
  }

  async function handleCopyReceipt() {
    if (!receipt) return;
    const balance = Math.max(0, receipt.membership.balanceDue);
    const text =
      `*BSF THE GYM — PAYMENT RECEIPT* 🧾\n` +
      `_Gotri-Sevasi Road, Vadodara, Gujarat_\n\n` +
      `*Receipt No:* #${receipt.receiptNumber}\n` +
      `*Date:* ${formattedDate}\n\n` +
      `*MEMBER DETAILS:*\n` +
      `• *Name:* ${receipt.member.fullName}\n` +
      `• *Phone:* +91 ${receipt.member.phoneNumber}\n\n` +
      `*MEMBERSHIP DETAILS:*\n` +
      `• *Plan:* ${receipt.membership.planName} Membership\n` +
      `• *Validity:* ${formattedStart} to ${formattedEnd}\n\n` +
      `*PAYMENT DETAILS:*\n` +
      `• *Plan Fee:* ₹${receipt.membership.priceAtPurchase.toLocaleString("en-IN")}\n` +
      (receipt.membership.discount > 0
        ? `• *Discount:* -₹${receipt.membership.discount.toLocaleString("en-IN")}\n`
        : ``) +
      `• *Total Plan Amount:* ₹${receipt.membership.finalAmount.toLocaleString("en-IN")}\n` +
      `• *Amount Paid:* ₹${receipt.amount.toLocaleString("en-IN")}\n` +
      `• *Payment Mode:* ${receipt.paymentMethod}\n` +
      `• *Remaining Balance:* ₹${balance.toLocaleString("en-IN")}\n\n` +
      `Thank you for working out with *BSF THE GYM*! 💪🏋️‍♂️`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Payment Receipt"
      subtitle={`Receipt #${receipt.receiptNumber}`}
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Printable Receipt Card */}
        <div
          id="printable-receipt"
          className="bg-[#111316] border border-[#252830] rounded-xl p-6 space-y-4 text-gray-200 print:bg-white print:text-black print:border-black print:p-6 print:rounded-none print:shadow-none"
        >
          {/* Gym Header */}
          <div className="border-b-2 border-dashed border-[#252830] print:border-gray-800 pb-3 text-center">
            {(receipt.isPending || receipt.paymentStatus === "PENDING_VERIFICATION") && (
              <div className="mb-2 py-1 px-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[11px] tracking-wider uppercase inline-block print:border-black print:text-black">
                DRAFT — PENDING ADMIN VERIFICATION
              </div>
            )}
            <div className="flex items-center justify-center gap-2">
              <Dumbbell className="w-5 h-5 text-amber-400 print:text-black" />
              <h2 className="text-lg font-extrabold font-display tracking-wider text-white print:text-black uppercase">
                BSF THE GYM
              </h2>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-amber-500 print:text-gray-800 font-semibold mt-0.5">
              Fitness & Strength Club
            </p>
            <p className="text-[11px] text-gray-400 print:text-gray-700 mt-1 leading-tight">
              Gotri-Sevasi Road, Vadodara, Gujarat 390021<br />
              Tel: +91 98250 00000 &bull; Email: info@bsfgym.com
            </p>
          </div>

          {/* Receipt Meta Details */}
          <div className="flex justify-between items-center text-xs py-1 border-b border-[#252830] print:border-gray-400 font-mono">
            <div>
              <span className="text-[10px] text-gray-500 print:text-gray-600 block uppercase">Receipt No</span>
              <span className="font-bold text-white print:text-black text-sm">{receipt.receiptNumber}</span>
              {receipt.membership.membershipReference && (
                <span className="text-[10px] text-gray-400 print:text-gray-600 block mt-0.5">
                  Ref: {receipt.membership.membershipReference}
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-500 print:text-gray-600 block uppercase">Date & Time</span>
              <span className="text-gray-300 print:text-gray-800 text-xs">{formattedDate}</span>
            </div>
          </div>

          {/* Member Details */}
          <div className="bg-[#17191E] print:bg-white p-3 rounded-lg border border-[#252830] print:border-gray-400 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400 print:text-gray-600">Member Name:</span>
              <span className="font-bold text-white print:text-black">{receipt.member.fullName}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-gray-400 print:text-gray-600">Phone:</span>
              <span className="text-gray-300 print:text-black">{receipt.member.phoneNumber}</span>
            </div>
          </div>

          {/* Membership & Validity */}
          <div className="text-xs space-y-1.5 pt-1">
            <div className="flex justify-between text-gray-400 print:text-gray-600 uppercase text-[10px] font-semibold border-b border-[#252830] print:border-gray-400 pb-1">
              <span>Item Description</span>
              <span>Validity</span>
            </div>
            <div className="flex justify-between items-start py-0.5">
              <div>
                <span className="font-bold text-white print:text-black block">{receipt.membership.planName}</span>
                <span className="text-[10px] text-gray-500 print:text-gray-600">Gym Access & Strength Training</span>
              </div>
              <span className="font-mono text-xs font-medium text-gray-300 print:text-black text-right">
                {formattedStart} <br className="hidden print:block" />to {formattedEnd}
              </span>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="space-y-1.5 text-xs pt-2 border-t border-[#252830] print:border-gray-400">
            <div className="flex justify-between text-gray-400 print:text-gray-700">
              <span>Plan Standard Fee:</span>
              <span className="font-mono">₹{receipt.membership.priceAtPurchase.toLocaleString("en-IN")}</span>
            </div>
            {receipt.membership.discount > 0 && (
              <div className="flex justify-between text-emerald-400 print:text-black">
                <span>Special Discount:</span>
                <span className="font-mono">-₹{receipt.membership.discount.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-300 print:text-black font-semibold">
              <span>Total Plan Amount:</span>
              <span className="font-mono">₹{receipt.membership.finalAmount.toLocaleString("en-IN")}</span>
            </div>

            {/* Highlighted Paid Box */}
            <div className="flex justify-between items-center p-2.5 my-1.5 rounded bg-amber-500/10 print:bg-gray-100 border border-amber-500/20 print:border-black font-bold text-sm">
              <span className="text-white print:text-black">Amount Paid This Receipt:</span>
              <span className="text-amber-400 print:text-black font-mono text-base">
                ₹{receipt.amount.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between text-[11px] text-gray-400 print:text-gray-700 pt-0.5">
              <span>Payment Mode:</span>
              <span className="font-bold text-white print:text-black uppercase px-1.5 py-0.5 rounded bg-[#252830] print:bg-transparent print:p-0">
                {receipt.paymentMethod}
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-gray-400 print:text-gray-700">
              <span>Remaining Balance Due:</span>
              <span className={`font-mono font-bold ${receipt.membership.balanceDue > 0 ? "text-amber-400 print:text-black" : "text-emerald-400 print:text-black"}`}>
                ₹{Math.max(0, receipt.membership.balanceDue).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Signatures & Footer */}
          <div className="pt-4 border-t-2 border-dashed border-[#252830] print:border-gray-800 space-y-3">
            <div className="grid grid-cols-2 gap-4 pt-2 text-[10px] text-gray-400 print:text-black">
              <div>
                <span className="block text-gray-500 print:text-gray-600">Processed By:</span>
                <span className="font-medium text-white print:text-black">
                  {receipt.receivedBy?.name || "BSF Front Desk"}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-gray-500 print:text-gray-600">Authorized Signature</span>
                <div className="mt-4 border-b border-gray-400 w-28 ml-auto print:block"></div>
              </div>
            </div>

            <div className="text-center text-[10px] text-gray-500 print:text-gray-700 font-medium italic pt-1">
              *** Thank you for working out with BSF THE GYM! Stay fit, stay strong. ***
            </div>
          </div>
        </div>

        {/* Notice alert */}
        {notice && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{notice}</span>
          </div>
        )}

        {/* Modal Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-[#252830]">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-[#252830] transition-colors"
          >
            Close
          </button>

          <div className="w-full sm:w-auto flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#17191E] hover:bg-[#252830] text-gray-300 hover:text-white border border-[#252830] text-xs font-medium transition-colors"
              title="Download Receipt as PDF file"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={handleSharePDFWhatsApp}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold shadow-lg shadow-emerald-900/20 transition-all hover:scale-[1.02]"
              title={`Directly open WhatsApp chat with ${receipt.member.fullName}`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Send to WhatsApp ({receipt.member.whatsappNumber || receipt.member.phoneNumber})</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold shadow-lg shadow-amber-500/10 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
