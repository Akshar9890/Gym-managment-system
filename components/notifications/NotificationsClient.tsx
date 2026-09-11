// components/notifications/NotificationsClient.tsx — Categorized Notification Center
"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  MessageSquare,
  RefreshCw,
  Terminal,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";

export interface NotificationItem {
  id: string;
  type: string;
  channel: string;
  status: string;
  sentAt: string;
  triggerDate: string;
  metadata?: any;
  member: {
    id: string;
    memberId: string;
    fullName: string;
    whatsappNumber: string;
  };
  membership?: {
    id: string;
    planName: string;
    endDate: string;
    membershipStatus: string;
  } | null;
}

interface NotificationsClientProps {
  notifications: NotificationItem[];
}

export function NotificationsClient({ notifications }: NotificationsClientProps) {
  const [activeTab, setActiveTab] = useState<"ALL" | "URGENT" | "WARNING" | "INFO">("ALL");

  const categorized = useMemo(() => {
    const urgent: NotificationItem[] = [];
    const warning: NotificationItem[] = [];
    const info: NotificationItem[] = [];

    notifications.forEach((n) => {
      if (n.status === "FAILED") {
        urgent.push(n);
      } else if (
        n.type === "EXPIRY_WARNING_10D" ||
        n.membership?.membershipStatus === "EXPIRING_SOON"
      ) {
        warning.push(n);
      } else {
        info.push(n);
      }
    });

    return { all: notifications, urgent, warning, info };
  }, [notifications]);

  const currentList = {
    ALL: categorized.all,
    URGENT: categorized.urgent,
    WARNING: categorized.warning,
    INFO: categorized.info,
  }[activeTab];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white tracking-tight">
            Notification Center
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Log of all member renewal reminders and payment receipts sent via WhatsApp.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#252830] pb-2">
        {[
          { id: "ALL", label: "All Messages", count: categorized.all.length },
          { id: "URGENT", label: "Urgent / Failed", count: categorized.urgent.length },
          { id: "WARNING", label: "Warnings", count: categorized.warning.length },
          { id: "INFO", label: "WhatsApp Sent", count: categorized.info.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
              activeTab === tab.id
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                : "text-gray-400 hover:text-white hover:bg-[#17191E]"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                activeTab === tab.id
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-[#252830] text-gray-400"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {currentList.length === 0 ? (
          <div className="bg-[#17191E] border border-[#252830] rounded-xl p-12 text-center text-gray-500 text-xs">
            No notifications in this category.
          </div>
        ) : (
          currentList.map((n) => {
            return (
              <div
                key={n.id}
                className="bg-[#17191E] border border-[#252830] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg hover:border-amber-500/20 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-[#111316] border border-[#252830] flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/members/${n.member.id}`}
                        className="font-semibold text-sm text-white hover:text-amber-400 transition-colors"
                      >
                        {n.member.fullName}
                      </Link>
                      <span className="text-gray-500 font-mono text-[11px]">
                        ({n.member.memberId})
                      </span>
                      <StatusBadge status={n.status} size="sm" />
                    </div>

                    <p className="text-xs text-gray-400 mt-1">
                      {n.type === "EXPIRY_WARNING_10D"
                        ? "10-day renewal reminder triggered"
                        : n.type.replace("_", " ")}
                      {n.membership ? ` for ${n.membership.planName} Plan` : ""}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-gray-500 font-mono mt-1.5">
                      <span>Recipient: {n.member.whatsappNumber}</span>
                      <span>•</span>
                      <span>Trigger Date: {n.triggerDate}</span>
                      <span>•</span>
                      <span>{format(new Date(n.sentAt), "dd MMM yyyy, hh:mm a")}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    href={`/members/${n.member.id}`}
                    className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-[#111316] border border-[#252830] transition-colors"
                  >
                    <span>View Member</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
