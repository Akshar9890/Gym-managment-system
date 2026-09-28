// components/pwa/PwaAnalyticsCard.tsx — PWA analytics dashboard card for /reports
"use client";

import React, { useEffect, useState } from "react";
import {
  Smartphone,
  Download,
  WifiOff,
  RefreshCw,
  Activity,
  TrendingUp,
  Users,
  BarChart3,
} from "lucide-react";

interface PwaTelemetryStats {
  totalEvents: number;
  standaloneCount: number;
  standaloneRate: number;
  installShown: number;
  installAccepted: number;
  installConversionRate: number;
  offlineEvents: number;
  syncEvents: number;
  sessionStarts: number;
  byEvent: { event: string; count: number }[];
  byPlatform: { platform: string; count: number }[];
  recentEvents: {
    event: string;
    platform: string;
    isStandalone: boolean;
    createdAt: string;
  }[];
}

const EVENT_LABELS: Record<string, string> = {
  SESSION_START: "App Opens",
  INSTALL_PROMPT_SHOWN: "Install Prompted",
  INSTALL_ACCEPTED: "Installs",
  INSTALL_DISMISSED: "Install Dismissed",
  OFFLINE_DETECTED: "Went Offline",
  ONLINE_RESTORED: "Online Restored",
  OFFLINE_QUEUE_SYNCED: "Queue Synced",
  UPDATE_AVAILABLE: "Updates Detected",
  UPDATE_ACCEPTED: "Updates Applied",
};

const PLATFORM_COLORS: Record<string, string> = {
  Android: "bg-green-500",
  iOS: "bg-blue-500",
  Windows: "bg-sky-500",
  macOS: "bg-purple-500",
  Linux: "bg-orange-400",
  Other: "bg-gray-500",
};

function StatPill({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1.5 rounded-xl p-4 border ${
        highlight
          ? "bg-amber-500/10 border-amber-500/30"
          : "bg-[#111317] border-gray-800"
      }`}
    >
      <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
        <Icon className={`w-3.5 h-3.5 ${highlight ? "text-amber-400" : "text-gray-500"}`} />
        {label}
      </div>
      <p className={`text-2xl font-bold ${highlight ? "text-amber-400" : "text-white"}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-gray-500">{sub}</p>}
    </div>
  );
}

export function PwaAnalyticsCard() {
  const [stats, setStats] = useState<PwaTelemetryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/pwa/telemetry")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-[#0E1016] p-6 animate-pulse">
        <div className="h-5 w-40 bg-gray-800 rounded mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-800/60 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-[#0E1016] p-6">
        <p className="text-sm text-gray-500">PWA analytics unavailable: {error}</p>
      </div>
    );
  }

  // Total platforms for bar chart
  const totalPlatformEvents = stats.byPlatform.reduce((s, p) => s + p.count, 0);

  return (
    <section
      aria-labelledby="pwa-analytics-heading"
      className="rounded-2xl border border-gray-800 bg-[#0E1016] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <Smartphone className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2 id="pwa-analytics-heading" className="text-sm font-semibold text-white">
              PWA Analytics
            </h2>
            <p className="text-[11px] text-gray-500">
              Installation adoption & offline usage
            </p>
          </div>
        </div>
        <span className="text-[11px] text-gray-600 font-mono">
          {stats.totalEvents.toLocaleString()} events
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatPill
            icon={Users}
            label="App Opens"
            value={stats.sessionStarts.toLocaleString()}
            sub="Total sessions tracked"
          />
          <StatPill
            icon={Download}
            label="Install Rate"
            value={`${stats.installConversionRate}%`}
            sub={`${stats.installAccepted} of ${stats.installShown} prompted`}
            highlight={stats.installConversionRate > 0}
          />
          <StatPill
            icon={Smartphone}
            label="Standalone"
            value={`${stats.standaloneRate}%`}
            sub={`${stats.standaloneCount} standalone opens`}
          />
          <StatPill
            icon={WifiOff}
            label="Offline Events"
            value={stats.offlineEvents.toLocaleString()}
            sub={`${stats.syncEvents} queued syncs`}
          />
        </div>

        {/* Platform breakdown */}
        {stats.byPlatform.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 mb-3 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-gray-600" />
              Platform Breakdown
            </p>
            <div className="space-y-2">
              {stats.byPlatform.map((p) => {
                const pct = totalPlatformEvents > 0
                  ? Math.round((p.count / totalPlatformEvents) * 100)
                  : 0;
                const barColor = PLATFORM_COLORS[p.platform] ?? "bg-gray-600";
                return (
                  <div key={p.platform} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-16 shrink-0">{p.platform}</span>
                    <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right shrink-0">
                      {p.count.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Event frequency */}
        {stats.byEvent.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 mb-3 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-gray-600" />
              Event Frequency
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {stats.byEvent.slice(0, 9).map((ev) => (
                <div
                  key={ev.event}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#111317] border border-gray-800 text-xs"
                >
                  <span className="text-gray-400 truncate pr-2">
                    {EVENT_LABELS[ev.event] ?? ev.event}
                  </span>
                  <span className="font-semibold text-white shrink-0">{ev.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent events feed */}
        {stats.recentEvents.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-gray-600" />
              Recent Events
            </p>
            <div className="divide-y divide-gray-800/60 rounded-xl border border-gray-800 overflow-hidden">
              {stats.recentEvents.slice(0, 8).map((ev, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3.5 py-2.5 bg-[#0C0F14] hover:bg-[#111317] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        ev.event.includes("ACCEPTED") || ev.event === "SESSION_START"
                          ? "bg-green-500"
                          : ev.event.includes("OFFLINE")
                          ? "bg-amber-500"
                          : ev.event.includes("DISMISSED")
                          ? "bg-gray-600"
                          : "bg-blue-500"
                      }`}
                    />
                    <span className="text-xs text-gray-300 truncate">
                      {EVENT_LABELS[ev.event] ?? ev.event}
                    </span>
                    {ev.isStandalone && (
                      <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">
                        PWA
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-[11px] text-gray-600">{ev.platform}</span>
                    <span className="text-[11px] text-gray-600">
                      {new Date(ev.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {stats.totalEvents === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <RefreshCw className="w-8 h-8 text-gray-700 mb-3" />
            <p className="text-sm text-gray-500">No telemetry data yet</p>
            <p className="text-xs text-gray-600 mt-1">
              Events will appear here as users interact with the PWA
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
