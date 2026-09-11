// components/staff/StaffDashboardClient.tsx — Staff Dedicated Dashboard View
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { format, differenceInCalendarDays } from "date-fns";
import {
  Users,
  CreditCard,
  RefreshCw,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Send,
  Plus,
  Clock,
  CheckCircle2,
  Phone,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { SendReminderModal, ReminderMemberData } from "@/components/notifications/SendReminderModal";

interface StaffDashboardClientProps {
  staff: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
  };
  todayMetrics: {
    newMembers: number;
    membershipsCreated: number;
    renewals: number;
    revenue: number;
  };
  monthMetrics: {
    newMembers: number;
    membershipsCreated: number;
    renewals: number;
    revenue: number;
    averageValue: number;
  };
  expiringMembers: Array<{
    membershipId: string;
    memberId: string;
    memberName: string;
    phoneNumber: string;
    planName: string;
    endDate: string;
    daysRemaining: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: "MEMBERSHIP" | "PAYMENT";
    title: string;
    subtitle: string;
    amount: number;
    timestamp: string;
    status: string;
  }>;
}

export function StaffDashboardClient({
  staff,
  todayMetrics,
  monthMetrics,
  expiringMembers,
  recentActivity,
}: StaffDashboardClientProps) {
  const [reminderTarget, setReminderTarget] = useState<ReminderMemberData | null>(null);

  // Time-aware greeting
  const currentHour = new Date().getHours();
  let timeGreeting = "Good Morning";
  if (currentHour >= 12 && currentHour < 17) {
    timeGreeting = "Good Afternoon";
  } else if (currentHour >= 17) {
    timeGreeting = "Good Evening";
  }

  return (
    <div className="space-y-8 pb-12">
      {/* ─────────────────────────────────────────────────────────────
          1. STAFF HEADER / PROFILE
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#17191E] via-[#1A1D24] to-[#17191E] border border-[#252830] rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-display text-white tracking-tight">
              {timeGreeting}, {staff.name.split(" ")[0]} 👋
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active Staff
            </span>
          </div>
          <p className="text-xs text-gray-400 flex items-center gap-2">
            <span className="text-amber-400 font-medium">{staff.email}</span>
            <span className="text-gray-600">•</span>
            <span>Front Desk & Operational Management</span>
          </p>
        </div>

        {/* Quick Operational CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="/members"
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg shadow-amber-500/10 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Member / Renewal</span>
          </Link>
          <Link
            href="/payments"
            className="px-4 py-2.5 rounded-xl bg-[#20242D] hover:bg-[#282D38] text-white text-xs font-semibold border border-[#303542] transition-colors flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span>Payments</span>
          </Link>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. TODAY'S ACTIVITY
         ───────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
              Today's Activity
            </h2>
          </div>
          <span className="text-xs text-gray-500">
            {format(new Date(), "dd MMMM yyyy")}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Today New Members */}
          <div className="bg-[#17191E] border border-[#252830] rounded-xl p-5 relative overflow-hidden group hover:border-amber-500/30 transition-all">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-3">
              <span>New Members</span>
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {todayMetrics.newMembers}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Enrolled today</p>
          </div>

          {/* Today Memberships Created */}
          <div className="bg-[#17191E] border border-[#252830] rounded-xl p-5 relative overflow-hidden group hover:border-amber-500/30 transition-all">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-3">
              <span>Memberships</span>
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {todayMetrics.membershipsCreated}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Plans assigned today</p>
          </div>

          {/* Today Renewals */}
          <div className="bg-[#17191E] border border-[#252830] rounded-xl p-5 relative overflow-hidden group hover:border-amber-500/30 transition-all">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-3">
              <span>Renewals</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <RefreshCw className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {todayMetrics.renewals}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Extensions recorded</p>
          </div>

          {/* Today Revenue */}
          <div className="bg-[#17191E] border border-[#252830] rounded-xl p-5 relative overflow-hidden group hover:border-amber-500/30 transition-all">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-3">
              <span>Revenue</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-amber-400">
              ₹{todayMetrics.revenue.toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Collected today</p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. THIS MONTH PERFORMANCE
         ───────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
              Current Month Performance
            </h2>
          </div>
          <span className="text-xs text-gray-500">
            {format(new Date(), "MMMM yyyy")}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-[#17191E] border border-[#252830] rounded-xl p-4">
            <p className="text-xs text-gray-400">New Members</p>
            <p className="text-xl font-bold font-mono text-white mt-1">
              {monthMetrics.newMembers}
            </p>
          </div>
          <div className="bg-[#17191E] border border-[#252830] rounded-xl p-4">
            <p className="text-xs text-gray-400">Total Memberships</p>
            <p className="text-xl font-bold font-mono text-white mt-1">
              {monthMetrics.membershipsCreated}
            </p>
          </div>
          <div className="bg-[#17191E] border border-[#252830] rounded-xl p-4">
            <p className="text-xs text-gray-400">Renewals</p>
            <p className="text-xl font-bold font-mono text-white mt-1">
              {monthMetrics.renewals}
            </p>
          </div>
          <div className="bg-[#17191E] border border-[#252830] rounded-xl p-4">
            <p className="text-xs text-gray-400">Revenue</p>
            <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
              ₹{monthMetrics.revenue.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="bg-[#17191E] border border-[#252830] rounded-xl p-4">
            <p className="text-xs text-gray-400">Avg Plan Value</p>
            <p className="text-xl font-bold font-mono text-white mt-1">
              ₹{monthMetrics.averageValue.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. TWO-COLUMN: EXPIRING SOON + RECENT ACTIVITY
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 7 Cols: Members Expiring Soon */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white tracking-wide">
                Members Expiring Soon
              </h3>
            </div>
            <span className="text-xs text-gray-500">
              {expiringMembers.length} member{expiringMembers.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="bg-[#17191E] border border-[#252830] rounded-xl overflow-hidden shadow-xl">
            {expiringMembers.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs flex flex-col items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                <p>No memberships are expiring in the next 10 days!</p>
              </div>
            ) : (
              <div className="divide-y divide-[#252830]">
                {expiringMembers.map((m) => (
                  <div
                    key={m.membershipId}
                    className="p-4 hover:bg-[#1E2128]/50 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/members/${m.memberId}`}
                          className="text-xs font-semibold text-white hover:text-amber-400 transition-colors"
                        >
                          {m.memberName}
                        </Link>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-gray-400">
                        <span className="flex items-center gap-1 text-gray-400">
                          <Phone className="w-3 h-3 text-gray-500" />
                          {m.phoneNumber}
                        </span>
                        <span>•</span>
                        <span className="text-gray-300 font-medium">{m.planName}</span>
                        <span>•</span>
                        <span className="text-amber-400 font-mono">
                          Expires {format(new Date(m.endDate), "dd MMM")} ({m.daysRemaining}d left)
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setReminderTarget(m)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <Send className="w-3 h-3" />
                      <span>WhatsApp Reminder</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Cols: Recent Activity */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white tracking-wide">
              Your Recent Activity
            </h3>
            <span className="text-xs text-gray-500">Last 10 actions</span>
          </div>

          <div className="bg-[#17191E] border border-[#252830] rounded-xl p-4 shadow-xl space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">
                No recent activity recorded yet today.
              </p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-[#111316] border border-[#252830] flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="text-white font-medium">{item.title}</p>
                      <p className="text-[11px] text-gray-400">{item.subtitle}</p>
                      <p className="text-[10px] text-gray-500 font-mono">
                        {format(new Date(item.timestamp), "dd MMM, hh:mm a")}
                      </p>
                    </div>
                    <div className="text-right">
                      {item.amount > 0 && (
                        <p className="font-mono font-bold text-amber-400">
                          ₹{item.amount.toLocaleString("en-IN")}
                        </p>
                      )}
                      <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-[#17191E] text-gray-400 border border-[#252830]">
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WhatsApp Reminder Modal */}
      {reminderTarget && (
        <SendReminderModal
          isOpen={Boolean(reminderTarget)}
          onClose={() => setReminderTarget(null)}
          data={reminderTarget}
          onSuccess={() => setReminderTarget(null)}
        />
      )}
    </div>
  );
}
