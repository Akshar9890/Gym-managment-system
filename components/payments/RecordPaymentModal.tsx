// components/payments/RecordPaymentModal.tsx — Modal to record payment on a membership
"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { CreditCard, Loader2, AlertCircle } from "lucide-react";
import { PaymentProofUploader } from "@/components/payments/PaymentProofUploader";

interface MembershipOption {
  id: string;
  planName: string;
  finalAmount: number;
  paymentStatus: string;
  startDate: string;
  endDate: string;
}

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
  memberships: MembershipOption[];
  defaultMembershipId?: string;
  onSuccess?: () => void;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  memberId,
  memberName,
  memberships,
  defaultMembershipId,
  onSuccess,
}: RecordPaymentModalProps) {
  const [selectedMembershipId, setSelectedMembershipId] = useState(
    defaultMembershipId || (memberships[0]?.id || "")
  );
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "OTHER"
  >("UPI");
  const [paymentProof, setPaymentProof] = useState<string | null>(null);
  const [transactionReference, setTransactionReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultMembershipId) {
      setSelectedMembershipId(defaultMembershipId);
    } else if (memberships.length > 0 && !selectedMembershipId) {
      setSelectedMembershipId(memberships[0].id);
    }
  }, [defaultMembershipId, memberships, selectedMembershipId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMembershipId || amount <= 0) {
      setError("Please select a membership and enter a valid payment amount.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          membershipId: selectedMembershipId,
          amount: Number(amount),
          paymentMethod,
          paymentProof: paymentProof || undefined,
          transactionReference: transactionReference.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to record payment");
        return;
      }

      onSuccess?.();
      onClose();
    } catch {
      setError("Network error while recording payment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Payment"
      subtitle={`Capture payment receipt for ${memberName}`}
      maxWidth="md"
    >
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1.5">
            Apply to Membership *
          </label>
          <select
            value={selectedMembershipId}
            onChange={(e) => setSelectedMembershipId(e.target.value)}
            className="w-full px-3 py-2 bg-[#111316] border border-[#252830] rounded-lg text-xs text-white focus:outline-none focus:border-amber-500/50"
          >
            {memberships.map((m) => (
              <option key={m.id} value={m.id}>
                {m.planName} (Total: ₹{m.finalAmount.toLocaleString("en-IN")} • Status: {m.paymentStatus})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1.5">
            Amount (₹) *
          </label>
          <input
            type="number"
            min="1"
            required
            value={amount || ""}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="e.g. 1500"
            className="w-full px-3 py-2 bg-[#111316] border border-[#252830] rounded-lg text-sm text-amber-400 font-bold font-mono focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1.5">
            Payment Mode *
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as any)}
            className="w-full px-3 py-2 bg-[#111316] border border-[#252830] rounded-lg text-xs text-white focus:outline-none focus:border-amber-500/50"
          >
            <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Credit / Debit Card</option>
            <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1.5">
            Transaction / UPI Ref # (Optional)
          </label>
          <input
            type="text"
            value={transactionReference}
            onChange={(e) => setTransactionReference(e.target.value)}
            placeholder="e.g. UPI Ref / UTR / Cheque #"
            className="w-full px-3 py-2 bg-[#111316] border border-[#252830] rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1.5">
            Payment Notes (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Balance payment received"
            className="w-full px-3 py-2 bg-[#111316] border border-[#252830] rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="pt-1">
          <PaymentProofUploader
            value={paymentProof}
            onChange={setPaymentProof}
          />
        </div>

        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300/90 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <span>
            Staff-recorded payments require Admin verification before final confirmation.
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#252830]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-[#252830] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || amount <= 0}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-semibold shadow-lg shadow-amber-500/10 transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Recording…</span>
              </>
            ) : (
              <>
                <CreditCard className="w-3.5 h-3.5" />
                <span>Issue Receipt</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
