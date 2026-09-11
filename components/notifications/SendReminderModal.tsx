// components/notifications/SendReminderModal.tsx — Ready-to-send WhatsApp Reminder Modal
"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { MessageSquare, ExternalLink, Copy, Check, Send, AlertCircle, Dumbbell } from "lucide-react";
import { format } from "date-fns";

export interface ReminderMemberData {
  membershipId: string;
  memberId?: string;
  memberName: string;
  phoneNumber: string;
  whatsappNumber?: string;
  planName: string;
  endDate: string;
  daysRemaining: number;
}

interface SendReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReminderMemberData | null;
  onSuccess?: () => void;
}

export function SendReminderModal({
  isOpen,
  onClose,
  data,
  onSuccess,
}: SendReminderModalProps) {
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!data) return;

    let formattedDate = "";
    try {
      formattedDate = format(new Date(data.endDate), "dd MMM yyyy");
    } catch {
      formattedDate = data.endDate;
    }

    const daysText =
      data.daysRemaining <= 0
        ? "expires today"
        : `expires in ${data.daysRemaining} day${data.daysRemaining === 1 ? "" : "s"}`;

    const defaultMsg =
      `Hi *${data.memberName}*, 💪\n\n` +
      `This is a friendly reminder from *BSF THE GYM* (Gotri-Sevasi Road, Vadodara).\n\n` +
      `Your *${data.planName}* membership ${daysText} on *${formattedDate}*.\n\n` +
      `Renew your membership today to keep your fitness momentum going without pause! 🏋️‍♂️\n\n` +
      `Visit the front desk or contact us at +91 98250 00000 for quick renewal.`;

    setMessage(defaultMsg);
    setCopied(false);
    setStatusNotice(null);
  }, [data]);

  if (!data) return null;

  // Clean 10-digit Indian phone number
  const rawPhone = data.whatsappNumber || data.phoneNumber;
  const digitsOnly = rawPhone.replace(/\D/g, "");
  const normalizedPhone = digitsOnly.length === 10 ? `91${digitsOnly}` : digitsOnly.length === 12 && digitsOnly.startsWith("91") ? digitsOnly : `91${digitsOnly.slice(-10)}`;
  const waUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;

  async function handleRecordAndOpenWhatsApp() {
    setIsDispatching(true);
    setStatusNotice(null);

    // Call API in background to log notification & audit trail
    try {
      await fetch("/api/notifications/manual-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId: data?.membershipId }),
      });
    } catch (e) {
      console.error("Failed to log notification dispatch", e);
    } finally {
      setIsDispatching(false);
    }

    // Open WhatsApp Web or Mobile app directly with prefilled message
    window.open(waUrl, "_blank", "noopener,noreferrer");

    setStatusNotice({
      type: "success",
      text: "WhatsApp opened with pre-filled message! Reminder recorded in system.",
    });

    if (onSuccess) {
      onSuccess();
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send WhatsApp Renewal Reminder"
      subtitle={`Member: ${data.memberName}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Recipient Card */}
        <div className="bg-[#111316] border border-[#252830] rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">{data.memberName}</span>
            </div>
            <div className="text-xs font-mono text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <span>WhatsApp: +{normalizedPhone}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-medium text-gray-300 block">{data.planName}</span>
            <span
              className={`text-[10px] font-mono font-semibold ${
                data.daysRemaining <= 3 ? "text-red-400" : "text-amber-400"
              }`}
            >
              {data.daysRemaining <= 0
                ? "Expires Today"
                : `${data.daysRemaining} days left`}
            </span>
          </div>
        </div>

        {/* Message Editor */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <label htmlFor="reminder-msg" className="font-medium">
              Ready-to-Send Message:
            </label>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Text</span>
                </>
              )}
            </button>
          </div>
          <textarea
            id="reminder-msg"
            rows={7}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full bg-[#111316] border border-[#252830] focus:border-amber-500 rounded-lg p-3 text-xs text-gray-200 focus:outline-none resize-none leading-relaxed font-sans"
            placeholder="Enter reminder message..."
          />
          <p className="text-[11px] text-gray-500">
            You can edit this message before sending. Clicking below will open WhatsApp with this text ready.
          </p>
        </div>

        {/* Status Notice */}
        {statusNotice && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
              statusNotice.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}
          >
            {statusNotice.type === "success" ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusNotice.text}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-[#252830] transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleRecordAndOpenWhatsApp}
            disabled={isDispatching}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02]"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open in WhatsApp &amp; Send</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
