"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Eye,
  FileText,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  User,
  CreditCard,
  Calendar,
  IndianRupee,
  RefreshCw,
  X,
  AlertTriangle,
  FileCheck,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface PaymentItem {
  id: string;
  receiptNumber: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED" | "PAID" | "PARTIAL" | "REFUNDED";
  paymentProof?: string | null;
  transactionReference?: string | null;
  paidAt: string;
  notes?: string | null;
  rejectionReason?: string | null;
  verifiedAt?: string | null;
  member: {
    id: string;
    fullName: string;
    phoneNumber: string;
    email?: string | null;
  };
  receivedBy?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  verifiedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  membership?: {
    id: string;
    membershipReference: string;
    startDate: string;
    endDate: string;
    finalAmount: number;
    membershipStatus: string;
    plan: {
      name: string;
    };
  } | null;
}

export function PaymentVerificationClient({ currentUserId }: { currentUserId: string }) {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("PENDING_VERIFICATION");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [approvingPayment, setApprovingPayment] = useState<PaymentItem | null>(null);
  const [rejectingPayment, setRejectingPayment] = useState<PaymentItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = filterStatus === "ALL"
        ? "/api/payments?limit=100"
        : `/api/payments?status=${filterStatus}&limit=100`;

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load payments");
      setPayments(data.data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch payments");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleApprove = async () => {
    if (!approvingPayment) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/payments/${approvingPayment.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve payment");

      setActionSuccess(`Payment ${approvingPayment.receiptNumber} approved! Membership activated.`);
      setApprovingPayment(null);
      fetchPayments();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingPayment) return;
    if (!rejectionReason.trim() || rejectionReason.trim().length < 3) {
      setActionError("Please provide a valid rejection reason (at least 3 characters)");
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/payments/${rejectingPayment.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT",
          rejectionReason: rejectionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject payment");

      setActionSuccess(`Payment ${rejectingPayment.receiptNumber} rejected.`);
      setRejectingPayment(null);
      setRejectionReason("");
      fetchPayments();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter local search
  const filteredPayments = payments.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.member.fullName.toLowerCase().includes(q) ||
      p.member.phoneNumber.includes(q) ||
      p.receiptNumber.toLowerCase().includes(q) ||
      (p.membership?.membershipReference && p.membership.membershipReference.toLowerCase().includes(q)) ||
      (p.receivedBy?.name && p.receivedBy.name.toLowerCase().includes(q)) ||
      (p.transactionReference && p.transactionReference.toLowerCase().includes(q))
    );
  });

  const pendingCount = payments.filter((p) => p.paymentStatus === "PENDING_VERIFICATION").length;
  const pendingTotal = payments
    .filter((p) => p.paymentStatus === "PENDING_VERIFICATION")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white tracking-wide flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-amber-500" />
            Payment Verification Queue
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review and approve staff-submitted payments to activate memberships.
          </p>
        </div>

        <button
          onClick={fetchPayments}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Success Banner */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-950/20 border border-amber-500/30 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Pending Approvals
            </span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-3 font-mono">
            {pendingCount}
          </p>
          <p className="text-xs text-amber-300/80 mt-1">
            {formatCurrency(pendingTotal)} awaiting verification
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Policy Rule
            </span>
            <ShieldCheck className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm text-slate-300 mt-3 font-medium">
            Staff cannot verify their own payments
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Requires independent Admin or Super Admin review
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Activation Workflow
            </span>
            <FileCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-sm text-slate-300 mt-3 font-medium">
            Approval activates membership
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Sends receipt and updates membership status to ACTIVE
          </p>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#16181d] border border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by member name, phone, receipt or ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "PENDING_VERIFICATION", label: "Pending" },
            { id: "VERIFIED", label: "Verified" },
            { id: "REJECTED", label: "Rejected" },
            { id: "ALL", label: "All Records" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filterStatus === tab.id
                  ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                  : "bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payments List / Table */}
      <div className="rounded-2xl border border-slate-800 bg-[#16181d] overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-amber-500" />
            <p className="text-sm font-medium">Loading verification queue...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-rose-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm font-medium">{error}</p>
            <button
              onClick={fetchPayments}
              className="mt-3 px-4 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white"
            >
              Try Again
            </button>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-base font-medium text-slate-300">No payment records found</p>
            <p className="text-xs text-slate-500 mt-1">
              {filterStatus === "PENDING_VERIFICATION"
                ? "All staff payments have been verified! Great job."
                : "No matching payment records for the selected filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3.5 px-4">Member</th>
                  <th className="py-3.5 px-4">Receipt & Ref</th>
                  <th className="py-3.5 px-4">Amount & Method</th>
                  <th className="py-3.5 px-4">Proof</th>
                  <th className="py-3.5 px-4">Submitted By</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPayments.map((payment) => {
                  const isPending = payment.paymentStatus === "PENDING_VERIFICATION";
                  const isVerified = payment.paymentStatus === "VERIFIED" || payment.paymentStatus === "PAID";
                  const isRejected = payment.paymentStatus === "REJECTED";
                  const isSelfSubmission = payment.receivedBy?.id === currentUserId;

                  return (
                    <tr
                      key={payment.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Member Info */}
                      <td className="py-4 px-4">
                        <Link
                          href={`/members/${payment.member.id}`}
                          className="group block"
                          title="View member profile"
                        >
                          <p className="font-semibold text-white group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                            <span>{payment.member.fullName}</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors opacity-70 group-hover:opacity-100" />
                          </p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5 group-hover:text-slate-300">
                            {payment.member.phoneNumber}
                          </p>
                          {payment.membership && (
                            <span className="inline-block text-[11px] text-amber-400 font-medium mt-1">
                              {payment.membership.plan.name}
                            </span>
                          )}
                        </Link>
                      </td>

                      {/* Receipt & Membership Reference */}
                      <td className="py-4 px-4 font-mono text-xs">
                        <div className="text-slate-200 font-medium">
                          {payment.receiptNumber}
                        </div>
                        {payment.membership?.membershipReference && (
                          <Link
                            href={`/members/${payment.member.id}`}
                            className="inline-flex items-center gap-1 text-slate-400 hover:text-amber-400 text-[11px] mt-0.5 transition-colors underline decoration-slate-700 hover:decoration-amber-400"
                            title="Click to view member profile"
                          >
                            <span>{payment.membership.membershipReference}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </Link>
                        )}
                        <div className="text-[11px] text-slate-500 mt-1">
                          {formatDateTime(payment.paidAt)}
                        </div>
                      </td>

                      {/* Amount & Method */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-white text-base font-mono">
                          {formatCurrency(Number(payment.amount))}
                        </div>
                        <div className="text-xs text-slate-400 capitalize mt-0.5">
                          {payment.paymentMethod.toLowerCase()}
                        </div>
                        {payment.transactionReference && (
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            Tx: {payment.transactionReference}
                          </div>
                        )}
                      </td>

                      {/* Payment Proof */}
                      <td className="py-4 px-4">
                        {payment.paymentProof ? (
                          <button
                            type="button"
                            onClick={() => setSelectedProofUrl(payment.paymentProof || null)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium hover:bg-amber-500/20 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Proof
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500 italic">No proof</span>
                        )}
                      </td>

                      {/* Submitted By */}
                      <td className="py-4 px-4">
                        {payment.receivedBy ? (
                          <div>
                            <p className="text-xs font-medium text-slate-200">
                              {payment.receivedBy.name}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {payment.receivedBy.email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">Admin</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock className="w-3.5 h-3.5" />
                            Pending Review
                          </span>
                        )}
                        {isVerified && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Verified
                          </span>
                        )}
                        {isRejected && (
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <XCircle className="w-3.5 h-3.5" />
                              Rejected
                            </span>
                            {payment.rejectionReason && (
                              <p className="text-[11px] text-rose-400/80 mt-1 line-clamp-1 max-w-xs" title={payment.rejectionReason}>
                                {payment.rejectionReason}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-2">
                            {isSelfSubmission ? (
                              <span
                                className="text-xs text-slate-500 italic px-2 py-1 bg-slate-800/40 rounded-lg"
                                title="Self-approval is forbidden by policy"
                              >
                                Self-recorded
                              </span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setApprovingPayment(payment);
                                    setActionError(null);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectingPayment(payment);
                                    setRejectionReason("");
                                    setActionError(null);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold hover:bg-rose-500/20 transition-all flex items-center gap-1"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">
                            {payment.verifiedBy?.name ? `By ${payment.verifiedBy.name}` : "Processed"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Proof Viewer Modal */}
      {selectedProofUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
              <span className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" /> Attached Payment Proof
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={selectedProofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setSelectedProofUrl(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 flex items-center justify-center bg-black/40 max-h-[75vh] overflow-auto">
              {selectedProofUrl.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={selectedProofUrl}
                  className="w-full h-[65vh] rounded-lg border border-slate-800"
                  title="PDF Proof"
                />
              ) : (
                <img
                  src={selectedProofUrl}
                  alt="Payment Proof Full"
                  className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-md"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {approvingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Approve Payment & Activate Membership</h3>
              <p className="text-xs text-slate-400 mt-1">
                You are approving receipt <span className="font-mono text-amber-400">{approvingPayment.receiptNumber}</span> for{" "}
                <Link
                  href={`/members/${approvingPayment.member.id}`}
                  target="_blank"
                  className="text-amber-400 hover:underline font-medium inline-flex items-center gap-0.5"
                  title="Open member profile in new tab"
                >
                  <span>{approvingPayment.member.fullName}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="font-bold font-mono text-emerald-400">{formatCurrency(Number(approvingPayment.amount))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Method:</span>
                <span className="capitalize text-slate-200">{approvingPayment.paymentMethod.toLowerCase()}</span>
              </div>
              {approvingPayment.membership && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Plan:</span>
                  <span className="text-slate-200">{approvingPayment.membership.plan.name}</span>
                </div>
              )}
              {approvingPayment.receivedBy && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Staff:</span>
                  <span className="text-slate-200">{approvingPayment.receivedBy.name}</span>
                </div>
              )}
            </div>

            {actionError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {actionError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleApprove}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Confirm Approval"}
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setApprovingPayment(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Reject Payment Record</h3>
              <p className="text-xs text-slate-400 mt-1">
                Rejecting receipt <span className="font-mono text-rose-400">{rejectingPayment.receiptNumber}</span> for{" "}
                <Link
                  href={`/members/${rejectingPayment.member.id}`}
                  target="_blank"
                  className="text-amber-400 hover:underline font-medium inline-flex items-center gap-0.5"
                  title="Open member profile in new tab"
                >
                  <span>{rejectingPayment.member.fullName}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Reason for Rejection <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., UPI transaction ID not found, incorrect amount, blur proof..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                This reason will be visible on the receipt and recorded in the audit log.
              </p>
            </div>

            {actionError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {actionError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleReject}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Confirm Rejection"}
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setRejectingPayment(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
