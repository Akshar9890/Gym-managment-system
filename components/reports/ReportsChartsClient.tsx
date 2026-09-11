// components/reports/ReportsChartsClient.tsx — Analytics charts with recharts & CSV export buttons
"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Download, FileSpreadsheet, TrendingUp, Users, CreditCard, ShieldCheck } from "lucide-react";

interface ReportsChartsClientProps {
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  paymentMethods: Array<{ name: string; value: number }>;
  planDistribution: Array<{ name: string; count: number }>;
  notificationStats: Array<{ name: string; value: number }>;
  summary: {
    totalRevenue: number;
    activeCount: number;
    expiredCount: number;
    renewalRate: number;
  };
}

const COLORS = ["#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#EF4444"];

export function ReportsChartsClient({
  monthlyRevenue,
  paymentMethods,
  planDistribution,
  notificationStats,
  summary,
}: ReportsChartsClientProps) {
  function handleDownloadCsv(type: string) {
    window.location.href = `/api/reports/export?type=${type}`;
  }

  return (
    <div className="space-y-8">
      {/* Top Header & CSV Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white tracking-tight">
            Reports & Analytics
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Club revenue trends, membership plan distributions, and WhatsApp delivery observability.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleDownloadCsv("members")}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#17191E] hover:bg-[#1E2128] text-gray-200 hover:text-white border border-[#252830] text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export Members CSV</span>
          </button>
          <button
            onClick={() => handleDownloadCsv("payments")}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#17191E] hover:bg-[#1E2128] text-gray-200 hover:text-white border border-[#252830] text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export Payments CSV</span>
          </button>
          <button
            onClick={() => handleDownloadCsv("expirations")}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#17191E] hover:bg-[#1E2128] text-gray-200 hover:text-white border border-[#252830] text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export Expirations CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#17191E] border border-[#252830] rounded-xl p-4">
          <span className="text-xs text-gray-400 font-medium block">Total Revenue Collected</span>
          <span className="text-2xl font-bold font-display text-white tabular-nums mt-1 block">
            ₹{summary.totalRevenue.toLocaleString("en-IN")}
          </span>
          <span className="text-[11px] text-gray-500 mt-0.5 block">Lifetime receipts</span>
        </div>
        <div className="bg-[#17191E] border border-[#252830] rounded-xl p-4">
          <span className="text-xs text-gray-400 font-medium block">Active Members</span>
          <span className="text-2xl font-bold font-display text-emerald-400 tabular-nums mt-1 block">
            {summary.activeCount}
          </span>
          <span className="text-[11px] text-gray-500 mt-0.5 block">In good standing</span>
        </div>
        <div className="bg-[#17191E] border border-[#252830] rounded-xl p-4">
          <span className="text-xs text-gray-400 font-medium block">Expired Members</span>
          <span className="text-2xl font-bold font-display text-red-400 tabular-nums mt-1 block">
            {summary.expiredCount}
          </span>
          <span className="text-[11px] text-gray-500 mt-0.5 block">Overdue for renewal</span>
        </div>
        <div className="bg-[#17191E] border border-[#252830] rounded-xl p-4">
          <span className="text-xs text-gray-400 font-medium block">Active Retention Rate</span>
          <span className="text-2xl font-bold font-display text-amber-400 tabular-nums mt-1 block">
            {summary.renewalRate}%
          </span>
          <span className="text-[11px] text-gray-500 mt-0.5 block">Active / Total members</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Monthly Revenue Chart */}
        <div className="bg-[#17191E] border border-[#252830] rounded-xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-semibold text-white tracking-wide">
            Revenue by Month (₹)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#6B7280" fontSize={11} tickLine={false} />
                <YAxis stroke="#6B7280" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111316",
                    borderColor: "#252830",
                    borderRadius: "8px",
                    color: "#FFF",
                    fontSize: "12px",
                  }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Revenue"]}
                />
                <Bar dataKey="revenue" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Payment Methods Breakdown */}
        <div className="bg-[#17191E] border border-[#252830] rounded-xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-semibold text-white tracking-wide">
            Payment Mode Mix
          </h3>
          <div className="h-64 w-full flex items-center justify-center">
            {paymentMethods.length === 0 ? (
              <p className="text-xs text-gray-500">No payment records yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethods}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111316",
                      borderColor: "#252830",
                      borderRadius: "8px",
                      color: "#FFF",
                      fontSize: "12px",
                    }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Amount"]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(val) => <span className="text-xs text-gray-300">{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 3. Membership Distribution by Plan */}
        <div className="bg-[#17191E] border border-[#252830] rounded-xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-semibold text-white tracking-wide">
            Active Subscriptions by Plan
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#6B7280" fontSize={11} tickLine={false} />
                <YAxis stroke="#6B7280" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111316",
                    borderColor: "#252830",
                    borderRadius: "8px",
                    color: "#FFF",
                    fontSize: "12px",
                  }}
                  formatter={(val: any) => [val, "Members"]}
                />
                <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. WhatsApp Delivery Delivery Rate */}
        <div className="bg-[#17191E] border border-[#252830] rounded-xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-semibold text-white tracking-wide">
            WhatsApp Delivery Stats
          </h3>
          <div className="h-64 w-full flex items-center justify-center">
            {notificationStats.length === 0 ? (
              <p className="text-xs text-gray-500">No notifications dispatched yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={notificationStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {notificationStats.map((entry, index) => (
                      <Cell key={`notif-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111316",
                      borderColor: "#252830",
                      borderRadius: "8px",
                      color: "#FFF",
                      fontSize: "12px",
                    }}
                    formatter={(val: any) => [val, "Count"]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(val) => <span className="text-xs text-gray-300">{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
