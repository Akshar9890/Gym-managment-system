// components/payments/PaymentsListClient.tsx — Payments list with receipt view/print & filters
// Strictly uses Name, Phone, and Reference Numbers. No Member ID.

"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Search, Printer, ArrowUpDown, CreditCard, ChevronRight, IndianRupee } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { ReceiptModal, ReceiptData } from "@/components/payments/ReceiptModal";

export interface PaymentListItem {
  id: string;
  receiptNumber: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  notes?: string | null;
  paymentProof?: string | null;
  transactionReference?: string | null;
  member: {
    id: string;
    fullName: string;
    phoneNumber: string;
    email?: string | null;
  };
  membership: {
    id: string;
    membershipReference?: string;
    planName: string;
    startDate: string;
    endDate: string;
    priceAtPurchase: number;
    discount: number;
    finalAmount: number;
    paymentStatus: string;
  };
  receivedBy?: {
    name: string;
    role: string;
  } | null;
}

interface PaymentsListClientProps {
  initialPayments: PaymentListItem[];
  initialStatusFilter?: string;
}

export function PaymentsListClient({
  initialPayments,
  initialStatusFilter,
}: PaymentsListClientProps) {
  const [payments] = useState<PaymentListItem[]>(initialPayments);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    const s = (initialStatusFilter || "ALL").toUpperCase();
    if (s === "PARTIAL" || s === "DUE" || s === "PENDING") return "DUE";
    if (s === "PAID" || s === "VERIFIED") return "PAID";
    return s;
  });
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.receiptNumber.toLowerCase().includes(q) ||
        p.member.fullName.toLowerCase().includes(q) ||
        (p.membership.membershipReference && p.membership.membershipReference.toLowerCase().includes(q)) ||
        p.member.phoneNumber.includes(q);

      if (!matchesSearch) return false;

      if (methodFilter !== "ALL" && p.paymentMethod !== methodFilter) {
        return false;
      }

      if (statusFilter === "DUE") {
        if (p.membership.paymentStatus !== "PARTIAL" && p.membership.paymentStatus !== "PENDING") {
          return false;
        }
      } else if (statusFilter === "PAID") {
        if (p.membership.paymentStatus !== "PAID" && p.paymentStatus !== "VERIFIED") {
          return false;
        }
      }

      return true;
    });
  }, [payments, searchQuery, methodFilter, statusFilter]);

  function handleOpenReceipt(p: PaymentListItem) {
    const isPending = p.paymentStatus === "PENDING_VERIFICATION";
    const receipt: ReceiptData = {
      receiptNumber: p.receiptNumber,
      paymentDate: p.createdAt,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      paymentStatus: p.paymentStatus,
      isPending,
      isVerified: p.paymentStatus === "VERIFIED" || p.paymentStatus === "PAID",
      notes: p.notes,
      member: {
        fullName: p.member.fullName,
        phoneNumber: p.member.phoneNumber,
        email: p.member.email,
      },
      membership: {
        membershipReference: p.membership.membershipReference,
        planName: p.membership.planName,
        startDate: p.membership.startDate,
        endDate: p.membership.endDate,
        priceAtPurchase: p.membership.priceAtPurchase,
        discount: p.membership.discount,
        finalAmount: p.membership.finalAmount,
        paymentStatus: p.membership.paymentStatus,
        totalPaid: p.amount,
        balanceDue: Math.max(0, p.membership.finalAmount - p.amount),
      },
      receivedBy: p.receivedBy,
    };
    setSelectedReceipt(receipt);
  }

  const totalCollected = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [filteredPayments]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white tracking-wide">
            Payments & Receipts
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Complete transaction ledger with printable receipts & voucher downloads
          </p>
        </div>

        {/* Ledger Stat Card */}
        <div className="bg-[#17191E] border border-[#252830] rounded-xl px-4 py-2.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <IndianRupee className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider block">
              Filtered Total
            </span>
            <span className="text-base font-bold font-mono text-emerald-400">
              ₹{totalCollected.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#17191E] border border-[#252830] rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search receipt, member, ref, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111316] border border-[#252830] rounded-lg pl-10 pr-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: "ALL", label: "All Records" },
              { id: "DUE", label: "Due / Partial" },
              { id: "PAID", label: "Fully Paid" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all whitespace-nowrap ${
                  statusFilter === tab.id
                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/20 font-bold"
                    : "bg-[#111316] text-gray-400 hover:text-white border border-[#252830]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-[#252830] hidden md:block" />

          {/* Method Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {["ALL", "CASH", "UPI", "CARD", "NET_BANKING"].map((method) => (
              <button
                key={method}
                onClick={() => setMethodFilter(method)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all whitespace-nowrap ${
                  methodFilter === method
                    ? "bg-[#252830] text-amber-400 border border-amber-500/30"
                    : "bg-[#111316] text-gray-400 hover:text-white border border-[#252830]"
                }`}
              >
                {method === "ALL" ? "All Methods" : method.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Payments Table (Desktop) */}
      <div className="hidden md:block bg-[#17191E] border border-[#252830] rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#111316] border-b border-[#252830] uppercase font-semibold tracking-wider text-gray-400">
            <tr>
              <th className="py-3.5 px-5">Receipt No</th>
              <th className="py-3.5 px-4">Member</th>
              <th className="py-3.5 px-4">Date & Time</th>
              <th className="py-3.5 px-4">Plan</th>
              <th className="py-3.5 px-4">Amount</th>
              <th className="py-3.5 px-4">Method</th>
              <th className="py-3.5 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#252830]">
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-500">
                  No payment records found matching your filters.
                </td>
              </tr>
            ) : (
              filteredPayments.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-[#1E2128] transition-colors"
                >
                  <td className="py-3.5 px-5 font-mono font-semibold text-amber-400">
                    {p.receiptNumber}
                  </td>
                  <td className="py-3.5 px-4">
                    <Link
                      href={`/members/${p.member.id}`}
                      className="font-medium text-white hover:text-amber-400 transition-colors"
                    >
                      {p.member.fullName}
                    </Link>
                    {p.membership.membershipReference && (
                      <div className="text-[10px] font-mono text-gray-500">
                        {p.membership.membershipReference}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-gray-300">
                    {format(new Date(p.createdAt), "dd MMM yyyy, hh:mm a")}
                  </td>
                  <td className="py-3.5 px-4 text-gray-300">
                    {p.membership.planName}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-mono font-bold text-white">
                      ₹{p.amount.toLocaleString("en-IN")}
                    </div>
                    {p.membership.paymentStatus === "PARTIAL" && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        Due: ₹{Math.max(0, p.membership.finalAmount - p.amount).toLocaleString("en-IN")}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 uppercase text-gray-300 font-medium">
                    {p.paymentMethod}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => handleOpenReceipt(p)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#111316] hover:bg-[#252830] text-gray-200 hover:text-white border border-[#252830] transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-400" />
                      <span>Print Receipt</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredPayments.length === 0 ? (
          <div className="bg-[#17191E] border border-[#252830] rounded-xl p-8 text-center text-gray-500 text-xs">
            No payments found.
          </div>
        ) : (
          filteredPayments.map((p) => (
            <div
              key={p.id}
              className="bg-[#17191E] border border-[#252830] rounded-xl p-4 space-y-3 shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    {p.receiptNumber}
                  </span>
                  <div className="text-sm font-semibold text-white mt-0.5">
                    {p.member.fullName}
                  </div>
                  {p.membership.membershipReference && (
                    <div className="text-[11px] font-mono text-gray-500">
                      {p.membership.membershipReference}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-base font-bold font-mono text-white">
                    ₹{p.amount.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[11px] uppercase font-semibold text-gray-400">
                    {p.paymentMethod}
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-400 flex items-center justify-between pt-2 border-t border-[#252830]">
                <span>{p.membership.planName} Membership</span>
                <span className="font-mono text-[11px]">
                  {format(new Date(p.createdAt), "dd MMM yyyy")}
                </span>
              </div>

              <button
                onClick={() => handleOpenReceipt(p)}
                className="w-full py-2 bg-[#111316] hover:bg-[#252830] text-gray-300 hover:text-white rounded-lg border border-[#252830] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>View & Print Receipt</span>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Printable Receipt Modal */}
      <ReceiptModal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        receipt={selectedReceipt}
      />
    </div>
  );
}
