// components/pwa/OfflineQueueBanner.tsx — Floating pill and drawer for queued offline mutations
"use client";

import React, { useState } from "react";
import { useOfflineQueue } from "@/lib/offline/useOfflineQueue";
import { RefreshCw, CheckCircle2, AlertCircle, Clock, ChevronUp, ChevronDown, X } from "lucide-react";

export function OfflineQueueBanner() {
  const { queue, pendingCount, isSyncing, syncNow } = useOfflineQueue();
  const [isExpanded, setIsExpanded] = useState(false);

  if (queue.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-16 sm:bottom-6 left-4 z-40 max-w-sm w-full pointer-events-none">
      <div className="pointer-events-auto bg-[#181A20] border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 backdrop-blur-md">
        {/* Main Pill Header */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-6 h-6">
              {isSyncing ? (
                <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
              ) : (
                <>
                  <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-white">
                {isSyncing
                  ? "Synchronizing offline queue..."
                  : pendingCount > 0
                  ? `${pendingCount} offline action${pendingCount > 1 ? "s" : ""} pending`
                  : "All actions synced"}
              </p>
              <p className="text-[10px] text-gray-400">
                {pendingCount > 0 ? "Auto-syncs when online" : "Queue is clear"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                syncNow();
              }}
              disabled={isSyncing}
              aria-label="Sync offline actions now"
              className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-medium transition-colors disabled:opacity-50"
              title="Sync Now"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              aria-label={isExpanded ? "Collapse queue drawer" : "Expand queue drawer"}
              className="p-1.5 text-gray-400 hover:text-gray-200"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expanded Items Drawer */}
        {isExpanded && (
          <div className="px-4 pb-3 pt-1 border-t border-gray-800/80 max-h-56 overflow-y-auto space-y-2">
            {queue.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-2 p-2 rounded-lg bg-[#111317] border border-gray-800 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-200 truncate">{item.description}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    {item.lastError && (
                      <span className="text-red-400 truncate max-w-[140px]">• {item.lastError}</span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center">
                  {item.status === "syncing" ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/20 text-amber-300">
                      Syncing
                    </span>
                  ) : item.status === "failed" ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-red-500/20 text-red-400">
                      Failed
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-800 text-gray-400">
                      Pending
                    </span>
                  )}
                </div>
              </div>
            ))}

            <div className="pt-1 flex items-center justify-between">
              <span className="text-[10px] text-gray-500">{queue.length} total item(s)</span>
              <button
                onClick={syncNow}
                disabled={isSyncing}
                className="text-[11px] text-amber-400 hover:underline font-medium disabled:opacity-50"
              >
                Retry All Now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
