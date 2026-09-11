// components/members/RenewalModal.tsx — Renewal modal with continuity dates & payment capture
"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { RefreshCw, Loader2, AlertCircle, CheckCircle2, Calendar } from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import { PaymentProofUploader } from "@/components/payments/PaymentProofUploader";

interface Plan {
  id: string;
  name: string;
  durationMonths: number;
  price: number;
}

interface RenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
  currentMembership?: {
    id: string;
    planName: string;
    endDate: string;
    membershipStatus: string;
  } | null;
  onSuccess?: () => void;
}

export function RenewalModal({
  isOpen,
  onClose,
  memberId,
  memberName,
  currentMembership,
  onSuccess,
}: RenewalModalProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [discount, setDiscount] = useState<number>(0);
  const [recordPayment, setRecordPayment] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "CASH" | "CARD" | "BANK_TRANSFER" | "OTHER">("UPI");
  const [paymentProof, setPaymentProof] = useState<string | null>(null);
  const [transactionReference, setTransactionReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch plans
  useEffect(() => {
    if (isOpen) {
      setError(null);
      fetch("/api/plans")
        .then((r) => r.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : data?.data || [];
          if (Array.isArray(list)) {
            const activePlans = list.filter((p: any) => p.isActive !== false);
            setPlans(activePlans);
            if (activePlans.length > 0) {
              setSelectedPlanId(activePlans[0].id);
            }
          }
        })
        .catch(() => {});

      // Compute initial start date according to continuity rule (D1)
      if (
        currentMembership &&
        ["ACTIVE", "EXPIRING_SOON"].includes(currentMembership.membershipStatus)
      ) {
        const nextDay = addDays(parseISO(currentMembership.endDate), 1);
        setStartDate(format(nextDay, "yyyy-MM-dd"));
      } else {
        setStartDate(format(new Date(), "yyyy-MM-dd"));
      }
    }
  }, [isOpen, currentMembership]);

  // Sync amount when plan or discount changes
  useEffect(() => {
    const plan = plans.find((p) => p.id === selectedPlanId);
    if (plan) {
      const finalAmt = Math.max(0, plan.price - (Number(discount) || 0));
      setPaymentAmount(finalAmt);
    }
  }, [selectedPlanId, discount, plans]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlanId || !startDate) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        memberId,
        planId: selectedPlanId,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        discountAmount: Number(discount) || 0,
        discount: Number(discount) || 0,
        isRenewal: true,
        paymentProof: paymentProof || undefined,
        transactionReference: transactionReference.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (recordPayment && paymentAmount > 0) {
        payload.initialPayment = {
          amountPaid: Number(paymentAmount),
          amount: Number(paymentAmount),
          paymentMethod,
          paymentProof: paymentProof || undefined,
          transactionReference: transactionReference.trim() || undefined,
          paymentNotes: notes.trim() || "Renewal payment",
          notes: notes.trim() || "Renewal payment",
        };
      }

      const res = await fetch("/api/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        let errorMsg = data.error || data.details;
        if (!errorMsg && data.errors) {
          const errorList = Object.entries(data.errors)
            .map(([k, v]) => `${k}: ${(v as any).join?.(", ") || JSON.stringify(v)}`)
            .join("; ");
          errorMsg = errorList || "Failed to renew membership";
        }
        setError(errorMsg || "Failed to renew membership");
        return;
      }

      onSuccess?.();
      onClose();
    } catch {
      setError("Network error while submitting renewal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Renew Membership"
      subtitle={`Configure renewal period for ${memberName}`}
      maxWidth="lg"
    >
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {currentMembership && (
        <div className="mb-5 p-3 rounded-lg bg-[#111316] border border-[#252830] flex items-center justify-between text-xs">
          <div>
            <span className="text-gray-500">Current Plan: </span>
            <span className="text-white font-medium">{currentMembership.planName}</span>
          </div>
          <div>
            <span className="text-gray-500">Expires: </span>
            <span className="font-mono text-amber-400 font-medium">
              {format(parseISO(currentMembership.endDate), "dd MMM yyyy")}
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Plan Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1.5">
            Renewal Plan *
          </label>
          <select
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            className="w-full px-3 py-2 bg-[#111316] border border-[#252830] rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.durationMonths} Mo) — ₹{p.price.toLocaleString("en-IN")}
              </option>
            ))}
          </select>
        </div>

        {/* Start Date & Continuity Indicator */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-300">
              New Start Date *
            </label>
            {currentMembership && ["ACTIVE", "EXPIRING_SOON"].includes(currentMembership.membershipStatus) && (
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                <Calendar className="w-3 h-3" />
                Continuity: Auto-set to prev end + 1 day
              </span>
            )}
          </div>
          <input
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 bg-[#111316] border border-[#252830] rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Pricing & Discount */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Discount (₹)
            </label>
            <input
              type="number"
              min="0"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#111316] border border-[#252830] rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Final Amount (₹)
            </label>
            <div className="px-3 py-2 bg-[#111316] border border-[#252830] rounded-lg text-sm text-amber-400 font-bold font-mono">
              ₹{(selectedPlan ? Math.max(0, selectedPlan.price - (Number(discount) || 0)) : 0).toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        {/* Immediate Payment Capture */}
        <div className="p-4 rounded-xl bg-[#111316] border border-[#252830] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-200">
              Collect Payment Immediately
            </span>
            <input
              type="checkbox"
              checked={recordPayment}
              onChange={(e) => setRecordPayment(e.target.checked)}
              className="rounded border-[#252830] text-amber-500 focus:ring-amber-500"
            />
          </div>

          {recordPayment && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">
                    Amount Paid (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-[#17191E] border border-[#252830] rounded-lg text-xs text-white focus:outline-none focus:border-amber-500/50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-[#17191E] border border-[#252830] rounded-lg text-xs text-white focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">
                  Transaction / UPI Ref # (Optional)
                </label>
                <input
                  type="text"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  placeholder="e.g. UPI Ref / UTR / Cheque #"
                  className="w-full px-3 py-1.5 bg-[#17191E] border border-[#252830] rounded-lg text-xs text-white focus:outline-none focus:border-amber-500/50 font-mono"
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
                  Staff-recorded renewals with payment will require Admin verification before activation.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
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
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-semibold shadow-lg shadow-amber-500/10 transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing Renewal…</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Confirm Renewal</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
