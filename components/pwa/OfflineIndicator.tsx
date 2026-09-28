// components/pwa/OfflineIndicator.tsx — Realtime Online/Offline Status Pill
"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOffline(!navigator.onLine);

    const handleOffline = () => {
      setIsOffline(true);
      setShowRestored(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline && !showRestored) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
    >
      {isOffline ? (
        <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#1A1D23] border border-amber-500/40 text-amber-300 shadow-2xl backdrop-blur-md text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Offline Mode — Cached pages available</span>
        </div>
      ) : showRestored ? (
        <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#1A1D23] border border-emerald-500/40 text-emerald-300 shadow-2xl backdrop-blur-md text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
          <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Connection Restored</span>
        </div>
      ) : null}
    </div>
  );
}
