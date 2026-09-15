// components/members/MemberProfileClient.tsx — Full member profile view with renewal, payment, and WhatsApp actions
"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, differenceInCalendarDays } from "date-fns";
import {
  Phone,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  CreditCard,
  RefreshCw,
  Clock,
  Printer,
  ShieldCheck,
  User,
  MapPin,
  ArrowLeft,
  Loader2,
  FileText,
  Camera,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { RenewalModal } from "@/components/members/RenewalModal";
import { RecordPaymentModal } from "@/components/payments/RecordPaymentModal";
import { ReceiptModal, ReceiptData } from "@/components/payments/ReceiptModal";
import { SendReminderModal } from "@/components/notifications/SendReminderModal";
import { compressAndResizeImage } from "@/lib/image-util";
import { sendReceiptViaWhatsApp } from "@/lib/receipt-whatsapp";

interface MemberData {
  id: string;
  fullName: string;
  profilePhoto?: string | null;
  phoneNumber: string;
  whatsappNumber: string;
  whatsappVerified: boolean;
  email?: string | null;
  gender: string;
  dateOfBirth?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  joinDate: string;
  notes?: string | null;
  status: string;
  createdBy?: {
    id: string;
    name: string;
    email?: string;
    role?: string;
  } | null;
  memberships: Array<{
    id: string;
    membershipReference?: string | null;
    startDate: string;
    endDate: string;
    priceAtPurchase: number;
    discount: number;
    finalAmount: number;
    membershipStatus: string;
    paymentStatus: string;
    plan: {
      id: string;
      name: string;
      durationMonths: number;
      price: number;
    };
    createdBy?: {
      id: string;
      name: string;
      email?: string;
      role?: string;
    } | null;
    payments: Array<{
      id: string;
      receiptNumber: string;
      amount: number;
      paymentMethod: string;
      paymentStatus: string;
      createdAt: string;
      notes?: string | null;
      receivedBy?: {
        id: string;
        name: string;
        email?: string;
        role?: string;
      } | null;
    }>;
  }>;
  notifications: Array<{
    id: string;
    type: string;
    channel: string;
    status: string;
    sentAt: string;
    triggerDate: string;
    metadata?: any;
  }>;
}

interface MemberProfileClientProps {
  member: MemberData;
}

export function MemberProfileClient({ member }: MemberProfileClientProps) {
  const router = useRouter();
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ success: boolean; msg: string } | null>(null);

  // Photo state
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(member.profilePhoto || null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPhoto(true);
      const dataUrl = await compressAndResizeImage(file, 400, 0.82);
      const res = await fetch(`/api/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilePhoto: dataUrl }),
      });

      if (!res.ok) {
        setActionNotice({ success: false, msg: "Failed to update member photo" });
      } else {
        setCurrentPhoto(dataUrl);
        setActionNotice({ success: true, msg: "Member photo updated successfully ✓" });
        router.refresh();
      }
    } catch (err: any) {
      setActionNotice({ success: false, msg: "Error processing photo: " + (err.message || "Unknown error") });
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = "";
    }
  }

  // Modals state
  const [isRenewalOpen, setIsRenewalOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);

  // Derive active / latest membership and creator
  const latestMembership = member.memberships[0] || null;
  const creator = member.createdBy || member.memberships[0]?.createdBy || null;
  const daysLeft = latestMembership
    ? differenceInCalendarDays(new Date(latestMembership.endDate), new Date())
    : null;

  // Flatten all payments across all memberships
  const allPayments = member.memberships.flatMap((m) =>
    m.payments.map((p) => ({
      ...p,
      membershipPlanName: m.plan.name,
      membershipStartDate: m.startDate,
      membershipEndDate: m.endDate,
      priceAtPurchase: m.priceAtPurchase,
      discount: m.discount,
      finalAmount: m.finalAmount,
      membershipPaymentStatus: m.paymentStatus,
      receivedBy: p.receivedBy,
    }))
  );



  async function handleSendReminder() {
    if (!latestMembership || isSendingReminder) return;
    setIsSendingReminder(true);
    setActionNotice(null);

    try {
      const res = await fetch("/api/notifications/manual-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId: latestMembership.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setActionNotice({ success: false, msg: data.error || "Failed to trigger reminder" });
      } else {
        setActionNotice({
          success: true,
          msg: data.notification?.status === "SIMULATED"
            ? "WhatsApp reminder simulated (Dev Mode)"
            : "WhatsApp renewal reminder sent!",
        });
        router.refresh();
      }
    } catch {
      setActionNotice({ success: false, msg: "Network error triggering reminder" });
    } finally {
      setIsSendingReminder(false);
    }
  }

  function handleOpenReceipt(payment: any) {
    const totalPaid = member.memberships
      .find((m) => m.payments.some((p) => p.id === payment.id))
      ?.payments.reduce((sum, p) => sum + p.amount, 0) || payment.amount;

    const receipt: ReceiptData = {
      receiptNumber: payment.receiptNumber,
      paymentDate: payment.createdAt,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      notes: payment.notes,
      member: {
        fullName: member.fullName,
        phoneNumber: member.phoneNumber,
        whatsappNumber: member.whatsappNumber,
        email: member.email,
      },
      membership: {
        planName: payment.membershipPlanName,
        startDate: payment.membershipStartDate,
        endDate: payment.membershipEndDate,
        priceAtPurchase: payment.priceAtPurchase,
        discount: payment.discount,
        finalAmount: payment.finalAmount,
        paymentStatus: payment.membershipPaymentStatus,
        totalPaid,
        balanceDue: payment.finalAmount - totalPaid,
      },
    };

    setSelectedReceipt(receipt);
  }

  function handleSendWhatsAppDirect(payment: any) {
    const totalPaid = member.memberships
      .find((m) => m.payments.some((p) => p.id === payment.id))
      ?.payments.reduce((sum, p) => sum + p.amount, 0) || payment.amount;

    const receipt: ReceiptData = {
      receiptNumber: payment.receiptNumber,
      paymentDate: payment.createdAt,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      notes: payment.notes,
      member: {
        fullName: member.fullName,
        phoneNumber: member.phoneNumber,
        whatsappNumber: member.whatsappNumber,
        email: member.email,
      },
      membership: {
        planName: payment.membershipPlanName,
        startDate: payment.membershipStartDate,
        endDate: payment.membershipEndDate,
        priceAtPurchase: payment.priceAtPurchase,
        discount: payment.discount,
        finalAmount: payment.finalAmount,
        paymentStatus: payment.membershipPaymentStatus,
        totalPaid,
        balanceDue: payment.finalAmount - totalPaid,
      },
    };

    const targetPhone = sendReceiptViaWhatsApp(receipt);
    setActionNotice({
      success: true,
      msg: `Direct WhatsApp opened for ${member.fullName} (+${targetPhone}) & PDF downloaded!`,
    });
    setTimeout(() => setActionNotice(null), 5000);
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/members"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Members</span>
        </Link>
      </div>

      {/* Action Notification Alert */}
      {actionNotice && (
        <div
          className={`px-4 py-3 rounded-lg text-xs flex items-center justify-between border ${
            actionNotice.success
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-red-500/10 text-red-400 border-red-500/30"
          }`}
        >
          <span>{actionNotice.msg}</span>
          <button onClick={() => setActionNotice(null)} className="text-gray-400 hover:text-white">
            ×
          </button>
        </div>
      )}

      {/* Member Profile Header */}
      <div className="bg-[#17191E] border border-[#252830] rounded-xl p-6 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-display text-2xl font-bold overflow-hidden">
              {currentPhoto ? (
                <img
                  src={currentPhoto}
                  alt={member.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                member.fullName.charAt(0)
              )}
              {isUploadingPhoto && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                </div>
              )}
            </div>

            {/* Click to change/upload photo */}
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={isUploadingPhoto}
              title="Upload / Change Member Photo"
              className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-full bg-amber-500 text-black shadow-lg hover:bg-amber-400 transition-transform active:scale-95 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold font-display text-white">
                {member.fullName}
              </h1>
              <StatusBadge
                status={latestMembership?.membershipStatus || member.status}
                size="sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-gray-400 mt-1 font-sans">
              <span>Joined {format(new Date(member.joinDate), "dd MMM yyyy")}</span>
              {creator && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-gray-500">Added by:</span>
                    <span className="text-white font-medium">{creator.name}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsRenewalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold shadow-lg shadow-amber-500/10 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Renew Plan</span>
          </button>
          <button
            onClick={() => setIsPaymentOpen(true)}
            disabled={member.memberships.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#111316] hover:bg-[#1E2128] text-white border border-[#252830] text-xs font-medium transition-colors disabled:opacity-40"
          >
            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
            <span>Record Payment</span>
          </button>
          <button
            onClick={() => setIsReminderOpen(true)}
            disabled={!latestMembership}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#111316] hover:bg-[#1E2128] text-gray-300 hover:text-white border border-[#252830] text-xs font-medium transition-colors disabled:opacity-40"
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>Send WhatsApp Reminder</span>
          </button>
        </div>
      </div>

      {/* Two Column Layout: Current Plan + Personal Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Current Membership Card */}
        <div className="lg:col-span-2 space-y-6">
          {latestMembership ? (
            <div className="bg-[#17191E] border border-amber-500/20 rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#252830] pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                    Active Membership
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">
                    {latestMembership.plan.name} Plan ({latestMembership.plan.durationMonths} Months)
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={latestMembership.membershipStatus} />
                  <StatusBadge status={latestMembership.paymentStatus} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-gray-500 text-[11px] block">Start Date</span>
                  <span className="font-mono text-white font-medium">
                    {format(new Date(latestMembership.startDate), "dd MMM yyyy")}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 text-[11px] block">End Date (Inclusive)</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {format(new Date(latestMembership.endDate), "dd MMM yyyy")}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 text-[11px] block">Days Remaining</span>
                  <span
                    className={`font-mono font-bold ${
                      daysLeft !== null && daysLeft <= 3
                        ? "text-red-400"
                        : daysLeft !== null && daysLeft <= 10
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {daysLeft !== null
                      ? daysLeft < 0
                        ? `Expired ${Math.abs(daysLeft)}d ago`
                        : daysLeft === 0
                        ? "Expires Today"
                        : `${daysLeft} days`
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 text-[11px] block">Final Amount</span>
                  <span className="font-mono text-white font-bold">
                    ₹{latestMembership.finalAmount.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#17191E] border border-[#252830] rounded-xl p-8 text-center text-gray-400 space-y-3">
              <Calendar className="w-8 h-8 text-gray-500 mx-auto" />
              <p className="text-sm font-medium text-white">No Active Membership</p>
              <p className="text-xs text-gray-500">
                This member does not have an active subscription right now.
              </p>
              <button
                onClick={() => setIsRenewalOpen(true)}
                className="px-4 py-2 rounded-lg bg-amber-500 text-black text-xs font-semibold"
              >
                Assign Membership
              </button>
            </div>
          )}

          {/* Membership History Timeline (Immutable historical records) */}
          <div className="bg-[#17191E] border border-[#252830] rounded-xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-white tracking-wide">
              Membership History (Immutable Records)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#111316] text-gray-400 uppercase tracking-wider font-medium border-b border-[#252830]">
                  <tr>
                    <th className="py-2.5 px-4">Plan</th>
                    <th className="py-2.5 px-4">Period</th>
                    <th className="py-2.5 px-4">Price</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Payment</th>
                    <th className="py-2.5 px-4">Created By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252830]">
                  {member.memberships.map((m) => (
                    <tr key={m.id} className="hover:bg-[#1E2128]/50">
                      <td className="py-3 px-4 font-medium text-white">
                        {m.plan.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-300">
                        {format(new Date(m.startDate), "dd MMM yy")} –{" "}
                        {format(new Date(m.endDate), "dd MMM yy")}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-300">
                        ₹{m.finalAmount.toLocaleString("en-IN")}
                        {m.discount > 0 && (
                          <span className="text-[10px] text-emerald-400 block">
                            (-₹{m.discount})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={m.membershipStatus} size="sm" />
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={m.paymentStatus} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {m.createdBy ? (
                          <span className="text-white font-medium">{m.createdBy.name}</span>
                        ) : (
                          <span className="text-gray-500 italic">System / Admin</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments & Receipts */}
          <div className="bg-[#17191E] border border-[#252830] rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white tracking-wide">
                Payments & Receipts
              </h3>
              <button
                onClick={() => setIsPaymentOpen(true)}
                disabled={member.memberships.length === 0}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium"
              >
                + Record Payment
              </button>
            </div>
            {allPayments.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">
                No payments recorded yet for this member.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#111316] text-gray-400 uppercase tracking-wider font-medium border-b border-[#252830]">
                    <tr>
                      <th className="py-2.5 px-4">Receipt #</th>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Amount</th>
                      <th className="py-2.5 px-4">Method</th>
                      <th className="py-2.5 px-4">Recorded By</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252830]">
                    {allPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-[#1E2128]/50">
                        <td className="py-3 px-4 font-mono text-amber-400 font-medium">
                          {p.receiptNumber}
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-300">
                          {format(new Date(p.createdAt), "dd MMM yyyy")}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          ₹{p.amount.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4 uppercase text-gray-300">
                          {p.paymentMethod}
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          {p.receivedBy ? (
                            <span className="text-white font-medium">{p.receivedBy.name}</span>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => handleSendWhatsAppDirect(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950/50 hover:bg-emerald-900/80 text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 transition-colors text-xs font-medium"
                            title={`Open WhatsApp chat with ${member.fullName} (+91 ${member.whatsappNumber || member.phoneNumber}) and download receipt PDF`}
                          >
                            <MessageSquare className="w-3 h-3 text-emerald-400" />
                            <span>WhatsApp</span>
                          </button>
                          <button
                            onClick={() => handleOpenReceipt(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#111316] hover:bg-[#252830] text-gray-300 hover:text-white border border-[#252830] transition-colors text-xs font-medium"
                          >
                            <Printer className="w-3 h-3 text-amber-400" />
                            <span>Receipt</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Member Info + WhatsApp Logs */}
        <div className="space-y-6">
          {/* Member Details Card */}
          <div className="bg-[#17191E] border border-[#252830] rounded-xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-white tracking-wide border-b border-[#252830] pb-2">
              Contact & Personal Details
            </h3>

            <div className="space-y-3 text-xs">
              {creator && (
                <div className="pb-3 border-b border-[#252830]">
                  <span className="text-gray-500 text-[11px] block">Added By (Staff)</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-white font-semibold text-sm">{creator.name}</span>
                  </div>
                </div>
              )}
              <div>
                <span className="text-gray-500 text-[11px] block">Phone Number</span>
                <span className="font-mono text-gray-200">{member.phoneNumber}</span>
              </div>
              <div>
                <span className="text-gray-500 text-[11px] block">WhatsApp Number</span>
                <span className="font-mono text-gray-200">
                  {member.whatsappNumber}{" "}
                  {member.whatsappVerified ? "✓" : "⚠"}
                </span>
              </div>
              {member.email && (
                <div>
                  <span className="text-gray-500 text-[11px] block">Email</span>
                  <span className="text-gray-200">{member.email}</span>
                </div>
              )}
              <div>
                <span className="text-gray-500 text-[11px] block">Gender / DOB</span>
                <span className="text-gray-200">
                  {member.gender}
                  {member.dateOfBirth
                    ? ` • ${format(new Date(member.dateOfBirth), "dd MMM yyyy")}`
                    : ""}
                </span>
              </div>
              {member.address && (
                <div>
                  <span className="text-gray-500 text-[11px] block">Address</span>
                  <span className="text-gray-200">{member.address}</span>
                </div>
              )}
              {member.emergencyContactName && (
                <div className="pt-2 border-t border-[#252830]">
                  <span className="text-gray-500 text-[11px] block">Emergency Contact</span>
                  <span className="text-gray-200 font-medium">
                    {member.emergencyContactName}
                  </span>
                  {member.emergencyContactPhone && (
                    <span className="font-mono text-gray-400 block text-[11px]">
                      {member.emergencyContactPhone}
                    </span>
                  )}
                </div>
              )}
              {member.notes && (
                <div className="pt-2 border-t border-[#252830]">
                  <span className="text-gray-500 text-[11px] block">Notes</span>
                  <p className="text-gray-300 italic text-[11px]">{member.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* WhatsApp Notification Log Card */}
          <div className="bg-[#17191E] border border-[#252830] rounded-xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-white tracking-wide border-b border-[#252830] pb-2">
              WhatsApp Reminder Logs
            </h3>

            {member.notifications.length === 0 ? (
              <p className="text-xs text-gray-500 py-3 text-center">
                No WhatsApp reminders sent to this member yet.
              </p>
            ) : (
              <div className="space-y-3">
                {member.notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-lg bg-[#111316] border border-[#252830] space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-[11px]">
                        {n.type.replace("_", " ")}
                      </span>
                      <StatusBadge status={n.status} size="sm" />
                    </div>
                    <div className="text-[11px] text-gray-400 font-mono flex items-center justify-between">
                      <span>Trigger: {n.triggerDate}</span>
                      <span>{format(new Date(n.sentAt), "dd MMM, hh:mm a")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Renewal Modal */}
      <RenewalModal
        isOpen={isRenewalOpen}
        onClose={() => setIsRenewalOpen(false)}
        memberId={member.id}
        memberName={member.fullName}
        currentMembership={
          latestMembership
            ? {
                id: latestMembership.id,
                planName: latestMembership.plan.name,
                endDate: latestMembership.endDate,
                membershipStatus: latestMembership.membershipStatus,
              }
            : null
        }
        onSuccess={() => router.refresh()}
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        memberId={member.id}
        memberName={member.fullName}
        memberships={member.memberships.map((m) => ({
          id: m.id,
          planName: m.plan.name,
          finalAmount: m.finalAmount,
          paymentStatus: m.paymentStatus,
          startDate: m.startDate,
          endDate: m.endDate,
        }))}
        defaultMembershipId={latestMembership?.id}
        onSuccess={() => router.refresh()}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        receipt={selectedReceipt}
      />

      {/* Ready-to-Send WhatsApp Modal */}
      {latestMembership && (
        <SendReminderModal
          isOpen={isReminderOpen}
          onClose={() => setIsReminderOpen(false)}
          data={{
            membershipId: latestMembership.id,
            memberId: member.id,
            memberName: member.fullName,
            phoneNumber: member.phoneNumber,
            whatsappNumber: member.whatsappNumber,
            planName: latestMembership.plan.name,
            endDate: latestMembership.endDate,
            daysRemaining: daysLeft ?? 0,
          }}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
