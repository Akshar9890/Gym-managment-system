// components/dashboard/UpcomingExpirationsTable.tsx — Upcoming expirations with 1-click WhatsApp reminder
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { format, differenceInCalendarDays } from "date-fns";
import { Send, Check, Loader2, AlertCircle, ArrowUpRight, MessageSquare } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";

export interface ExpirationRow {
  membershipId: string;
  memberId: string;
  memberName: string;
  phoneNumber: string;
  whatsappNumber: string;
  whatsappVerified: boolean;
  planName: string;
  endDate: string;
  membershipStatus: string;
  daysRemaining: number;
}

interface UpcomingExpirationsTableProps {
  initialRows: ExpirationRow[];
}

import { SendReminderModal, ReminderMemberData } from "@/components/notifications/SendReminderModal";

export function UpcomingExpirationsTable({ initialRows }: UpcomingExpirationsTableProps) {
  const [rows, setRows] = useState(initialRows);
  const [activeReminder, setActiveReminder] = useState<ReminderMemberData | null>(null);
  const [feedback, setFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  function handleOpenReminderModal(row: ExpirationRow) {
    setActiveReminder({
      membershipId: row.membershipId,
      memberId: row.memberId,
      memberName: row.memberName,
      phoneNumber: row.phoneNumber,
      whatsappNumber: row.whatsappNumber,
      planName: row.planName,
      endDate: row.endDate,
      daysRemaining: row.daysRemaining,
    });
  }

  if (rows.length === 0) {
    return (
      <div className="bg-[#17191E] border border-[#252830] rounded-xl p-8 text-center">
        <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
        <p className="text-white font-medium text-sm">No upcoming expirations</p>
        <p className="text-gray-500 text-xs mt-1">
          All active member plans are in good standing.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#17191E] border border-[#252830] rounded-xl overflow-hidden shadow-xl">
      <div className="p-5 border-b border-[#252830] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-wide">
            Upcoming Expirations (Next 10 Days)
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Sorted by nearest expiry date. 1-click WhatsApp triggers automated template.
          </p>
        </div>
        <Link
          href="/members?status=EXPIRING_SOON"
          className="text-xs text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1"
        >
          View All <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {feedback && (
        <div
          className={`px-5 py-2.5 text-xs flex items-center justify-between ${
            feedback.success
              ? "bg-emerald-500/10 text-emerald-400 border-b border-emerald-500/20"
              : "bg-red-500/10 text-red-400 border-b border-red-500/20"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.success ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{feedback.msg}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#111316] text-gray-400 uppercase tracking-wider font-medium border-b border-[#252830]">
            <tr>
              <th className="py-3 px-5">Member</th>
              <th className="py-3 px-4">Plan</th>
              <th className="py-3 px-4">Expiry Date</th>
              <th className="py-3 px-4">Days Left</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#252830]">
            {rows.map((row) => {
              const formattedDate = format(new Date(row.endDate), "dd MMM yyyy");

              return (
                <tr
                  key={row.membershipId}
                  className="hover:bg-[#1E2128]/50 transition-colors"
                >
                  <td className="py-3.5 px-5">
                    <Link
                      href={`/members/${row.memberId}`}
                      className="font-medium text-white hover:text-amber-400 transition-colors flex items-center gap-1.5"
                    >
                      <span>{row.memberName}</span>
                    </Link>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                      <span>{row.whatsappNumber}</span>
                      {row.whatsappVerified ? (
                        <span className="text-emerald-400" title="WhatsApp Verified">✓</span>
                      ) : (
                        <span className="text-amber-500" title="Unverified WhatsApp">⚠</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-gray-300">
                    {row.planName}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-gray-300">
                    {formattedDate}
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span
                      className={`font-semibold ${
                        row.daysRemaining <= 3
                          ? "text-red-400"
                          : row.daysRemaining <= 7
                          ? "text-amber-400"
                          : "text-gray-300"
                      }`}
                    >
                      {row.daysRemaining <= 0
                        ? "Expires Today"
                        : `${row.daysRemaining} day${row.daysRemaining === 1 ? "" : "s"}`}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={row.membershipStatus} size="sm" />
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => handleOpenReminderModal(row)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all active:scale-95"
                      title="Send WhatsApp Renewal Reminder"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Remind</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-[#252830]">
        {rows.map((row) => {
          const formattedDate = format(new Date(row.endDate), "dd MMM yyyy");

          return (
            <div key={row.membershipId} className="p-4 space-y-2.5">
              <div className="flex items-start justify-between">
                <div>
                  <Link
                    href={`/members/${row.memberId}`}
                    className="text-sm font-semibold text-white hover:text-amber-400"
                  >
                    {row.memberName}
                  </Link>
                  <p className="text-[11px] font-mono text-gray-500">
                    {row.whatsappNumber}
                  </p>
                </div>
                <StatusBadge status={row.membershipStatus} size="sm" />
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{row.planName}</span>
                <span className="font-mono text-amber-400 font-medium">
                  {formattedDate} ({row.daysRemaining}d left)
                </span>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => handleOpenReminderModal(row)}
                  className="w-full py-2 rounded-lg text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center gap-1.5 transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send WhatsApp Reminder</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ready-to-Send WhatsApp Modal */}
      <SendReminderModal
        isOpen={!!activeReminder}
        onClose={() => setActiveReminder(null)}
        data={activeReminder}
        onSuccess={() => {
          setFeedback({
            success: true,
            msg: "Reminder opened and recorded in system",
          });
        }}
      />
    </div>
  );
}
