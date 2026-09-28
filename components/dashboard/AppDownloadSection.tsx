// components/dashboard/AppDownloadSection.tsx — Download application button, banner card, and modal
"use client";

import React, { useState } from "react";
import {
  Download,
  Smartphone,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Laptop,
  Apple,
} from "lucide-react";
import { usePwaInstall } from "@/lib/pwa/usePwaInstall";
import { AppDownloadModal } from "./AppDownloadModal";

export function AppDownloadButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { canInstall, isStandalone, promptInstall } = usePwaInstall();

  if (isStandalone) {
    return null;
  }

  const handleClick = async () => {
    if (canInstall) {
      const outcome = await promptInstall();
      if (outcome === "accepted") return;
    }
    setIsModalOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 text-xs font-semibold shadow-sm transition-all active:scale-95"
        title="Download and install BSF THE GYM App"
      >
        <Download className="w-3.5 h-3.5 text-emerald-400" />
        <span>Download App</span>
      </button>

      <AppDownloadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

export function AppDownloadCard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { canInstall, isStandalone, platform, promptInstall } = usePwaInstall();

  if (isStandalone) {
    return null;
  }

  const handleInstallClick = async () => {
    if (canInstall) {
      const outcome = await promptInstall();
      if (outcome === "accepted") return;
    }
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="bg-gradient-to-r from-[#17191E] via-[#1B1F27] to-[#14161C] border border-amber-500/30 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-amber-500/10 via-amber-500/5 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                <Smartphone className="w-3 h-3 text-amber-400" />
                Mobile & Desktop App
              </span>
              {isStandalone && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  Installed
                </span>
              )}
            </div>

            <h3 className="text-lg md:text-xl font-bold font-display text-white tracking-wide">
              Download BSF THE GYM Application
            </h3>

            <p className="text-xs text-gray-300 leading-relaxed">
              Install BSF THE GYM directly to your phone, tablet, or PC for fast 1-tap launching, full-screen view, and offline member check-in support.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Offline Member Roster</span>
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>1-Tap WhatsApp Receipts</span>
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero Storage Overhead</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black text-xs font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <Download className="w-4 h-4 text-black" />
              <span>{isStandalone ? "App Installed" : "Download / Install App"}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#111317] hover:bg-[#252830] text-gray-200 hover:text-white border border-[#252830] text-xs font-medium transition-colors"
            >
              <span>Setup Guide</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      <AppDownloadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
