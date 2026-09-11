// components/members/AddMemberModal.tsx — Multi-section member registration modal
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { UserPlus, Loader2, CheckCircle2, AlertCircle, Camera, Upload, X } from "lucide-react";
import { compressAndResizeImage } from "@/lib/image-util";
import { PaymentProofUploader } from "@/components/payments/PaymentProofUploader";

interface Plan {
  id: string;
  name: string;
  durationMonths: number;
  price: number;
}

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddMemberModal({ isOpen, onClose, onSuccess }: AddMemberModalProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Photo
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Optional initial membership
  const [addMembership, setAddMembership] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [discount, setDiscount] = useState<number>(0);
  const [recordPayment, setRecordPayment] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "OTHER">("UPI");
  const [paymentProof, setPaymentProof] = useState<string | null>(null);
  const [transactionReference, setTransactionReference] = useState("");

  useEffect(() => {
    if (isOpen) {
      setLoadingPlans(true);
      fetch("/api/plans")
        .then((r) => r.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : data?.data || [];
          if (Array.isArray(list)) {
            const activePlans = list.filter((p: Plan & { isActive?: boolean }) => p.isActive !== false);
            setPlans(activePlans);
            if (activePlans.length > 0 && !selectedPlanId) {
              setSelectedPlanId(activePlans[0].id);
              setPaymentAmount(Number(activePlans[0].price));
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoadingPlans(false));
    }
  }, [isOpen]);

  // Sync plan price to payment amount
  useEffect(() => {
    const plan = plans.find((p) => p.id === selectedPlanId);
    if (plan) {
      const finalAmt = Math.max(0, plan.price - (Number(discount) || 0));
      setPaymentAmount(finalAmt);
    }
  }, [selectedPlanId, discount, plans]);

  function handlePhoneChange(val: string) {
    setPhoneNumber(val);
    if (sameAsPhone) {
      setWhatsappNumber(val);
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPhotoProcessing(true);
      const dataUrl = await compressAndResizeImage(file, 400, 0.82);
      setProfilePhoto(dataUrl);
    } catch (err: any) {
      setError("Failed to process image: " + (err.message || "Unknown error"));
    } finally {
      setPhotoProcessing(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload: any = {
        fullName,
        profilePhoto: profilePhoto || undefined,
        gender,
        phoneNumber,
        whatsappNumber: sameAsPhone ? phoneNumber : whatsappNumber,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (dateOfBirth) {
        payload.dateOfBirth = new Date(dateOfBirth).toISOString();
      }

      if (addMembership && selectedPlanId) {
        payload.initialMembership = {
          planId: selectedPlanId,
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          discountAmount: Number(discount) || 0,
          amountPaid: recordPayment ? Number(paymentAmount) || 0 : 0,
          paymentMethod,
          paymentProof: paymentProof || undefined,
          transactionReference: transactionReference.trim() || undefined,
          paymentNotes: "Initial membership payment",
        };
      }

      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        let errorMsg = data.error;
        if (!errorMsg && data.errors) {
          const errorList = Object.entries(data.errors)
            .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
            .join("; ");
          errorMsg = errorList || "Failed to create member";
        }
        setError(errorMsg || "Failed to create member");
        return;
      }

      setProfilePhoto(null);
      setPaymentProof(null);
      setTransactionReference("");
      onSuccess?.();
      onClose();
    } catch {
      setError("Network error while creating member");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setProfilePhoto(null);
    setPaymentProof(null);
    setTransactionReference("");
    setError(null);
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Member"
      subtitle="Register member details and configure initial membership."
      maxWidth="xl"
    >
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Personal Details */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 border-b border-[#252830] pb-1.5">
            1. Personal Details
          </h4>

          {/* Member Photo Upload */}
          <div className="flex items-center gap-4 p-3 bg-[#111316] border border-[#252830] rounded-xl">
            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-[#1a1d24] border-2 border-amber-500/30 flex items-center justify-center shrink-0">
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt="Member preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera className="w-6 h-6 text-gray-500" />
              )}
              {photoProcessing && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white">Member Photo (Optional)</div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Upload member photo for gym profile & ID card
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoProcessing}
                  className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  <span>{profilePhoto ? "Change Photo" : "Upload Photo"}</span>
                </button>
                {profilePhoto && (
                  <button
                    type="button"
                    onClick={() => setProfilePhoto(null)}
                    className="px-2 py-1 text-gray-400 hover:text-red-400 text-xs transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ramesh Patel"
                className="w-full px-3 py-2 bg-[#111316] border border-[#252830] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Gender *
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#111316] border border-[#252830] rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3 py-2 bg-[#111316] border border-[#252830] rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="member@example.com"
                className="w-full px-3 py-2 bg-[#111316] border border-[#252830] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact Numbers (Indian Validation) */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 border-b border-[#252830] pb-1.5">
            2. Contact & WhatsApp (Vadodara / India)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Phone Number (10 digits) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-gray-500 font-mono">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="9825012345"
                  className="w-full pl-11 pr-3 py-2 bg-[#111316] border border-[#252830] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 font-mono"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-300">
                  WhatsApp Number *
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sameAsPhone}
                    onChange={(e) => {
                      setSameAsPhone(e.target.checked);
                      if (e.target.checked) setWhatsappNumber(phoneNumber);
                    }}
                    className="rounded border-[#252830] text-amber-500 focus:ring-amber-500"
                  />
                  <span>Same as phone</span>
                </label>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-gray-500 font-mono">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  disabled={sameAsPhone}
                  value={sameAsPhone ? phoneNumber : whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="9825012345"
                  className="w-full pl-11 pr-3 py-2 bg-[#111316] border border-[#252830] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 font-mono disabled:opacity-60"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Residential Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 104, Royal Palms, Gotri Road, Vadodara"
                className="w-full px-3 py-2 bg-[#111316] border border-[#252830] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Emergency Contact */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 border-b border-[#252830] pb-1.5">
            3. Emergency Contact (Optional)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Contact Name
              </label>
              <input
                type="text"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                placeholder="Relative / Spouse name"
                className="w-full px-3 py-2 bg-[#111316] border border-[#252830] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Contact Phone
              </label>
              <input
                type="tel"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                placeholder="10 digit mobile"
                className="w-full px-3 py-2 bg-[#111316] border border-[#252830] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Initial Membership & Payment */}
        <div className="space-y-4 p-4 rounded-xl bg-[#111316] border border-[#252830]">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              4. Initial Membership
            </h4>
            <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={addMembership}
                onChange={(e) => setAddMembership(e.target.checked)}
                className="rounded border-[#252830] text-amber-500 focus:ring-amber-500"
              />
              <span>Assign Plan Now</span>
            </label>
          </div>

          {addMembership && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Select Plan *
                  </label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#17191E] border border-[#252830] rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.durationMonths} Mo) — ₹{p.price.toLocaleString("en-IN")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required={addMembership}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#17191E] border border-[#252830] rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Discount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#17191E] border border-[#252830] rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Amount to Collect (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#17191E] border border-[#252830] rounded-lg text-sm text-amber-400 font-bold focus:outline-none focus:border-amber-500/50 font-mono"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="flex items-center justify-between pt-2 border-t border-[#252830]">
                <label className="text-xs font-medium text-gray-300">
                  Payment Mode:
                </label>
                <div className="flex items-center gap-2">
                  {(["UPI", "CASH", "CARD", "BANK_TRANSFER"] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                        paymentMethod === method
                          ? "bg-amber-500 text-black font-semibold border-amber-500"
                          : "bg-[#17191E] text-gray-400 border-[#252830] hover:text-white"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transaction Reference */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Transaction / UPI Ref # (Optional)
                </label>
                <input
                  type="text"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  placeholder="e.g. UPI Ref / UTR / Cheque #"
                  className="w-full px-3 py-2 bg-[#17191E] border border-[#252830] rounded-lg text-xs text-white focus:outline-none focus:border-amber-500/50 font-mono"
                />
              </div>

              {/* Payment Proof Attachment */}
              <div className="pt-1">
                <PaymentProofUploader
                  value={paymentProof}
                  onChange={setPaymentProof}
                />
              </div>

              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300/90 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  Staff-recorded payments require Admin verification before membership is marked active.
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
                <span>Creating Member…</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Save Member</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
