// components/dashboard/AppDownloadModal.tsx — Comprehensive App Download & Install Modal
"use client";

import React, { useState } from "react";
import {
  Download,
  X,
  Smartphone,
  Laptop,
  Share,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Zap,
  WifiOff,
} from "lucide-react";
import { usePwaInstall, PlatformType } from "@/lib/pwa/usePwaInstall";

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppDownloadModal({ isOpen, onClose }: AppDownloadModalProps) {
  const { canInstall, isStandalone, platform, promptInstall } = usePwaInstall();
  const [selectedTab, setSelectedTab] = useState<PlatformType>(
    platform === "iOS" ? "iOS" : platform === "Android" ? "Android" : "Windows"
  );
  const [copied, setCopied] = useState(false);
  const [installing, setInstalling] = useState(false);

  if (!isOpen) return null;

  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://gym-managment-system-eight.vercel.app";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDirectInstall = async () => {
    setInstalling(true);
    const outcome = await promptInstall();
    setInstalling(false);
    if (outcome === "accepted") {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#16181D] border border-amber-500/30 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#252830] bg-[#111317]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Download className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-white tracking-wide">
                Download BSF THE GYM App
              </h2>
              <p className="text-[11px] text-gray-400">
                Official Progressive Web App (PWA) for Mobile & Desktop
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#252830] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Status Banner */}
          {isStandalone ? (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-3 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                <strong>App is already installed!</strong> You are currently running BSF THE GYM in standalone app mode.
              </span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-[#1F232B] to-[#17191E] border border-amber-500/20">
              <div>
                <span className="text-xs font-semibold text-amber-400 block">
                  1-Click Direct Installation
                </span>
                <p className="text-[11px] text-gray-300 mt-0.5">
                  Detected device: <strong className="text-white capitalize">{platform}</strong>
                </p>
              </div>

              {canInstall ? (
                <button
                  type="button"
                  onClick={handleDirectInstall}
                  disabled={installing}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-95 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>{installing ? "Installing..." : "Install App Now"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-[#252830] hover:bg-[#2F333D] text-gray-200 text-xs font-medium transition-all shrink-0"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Link Copied!" : "Copy App Link"}</span>
                </button>
              )}
            </div>
          )}

          {/* Benefits Grid */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 rounded-xl bg-[#1B1E24] border border-[#252830]">
              <Zap className="w-4 h-4 text-amber-400 mx-auto mb-1.5" />
              <span className="text-xs font-semibold text-white block">Instant Launch</span>
              <span className="text-[10px] text-gray-400">1-tap from Home Screen</span>
            </div>
            <div className="p-3 rounded-xl bg-[#1B1E24] border border-[#252830]">
              <WifiOff className="w-4 h-4 text-emerald-400 mx-auto mb-1.5" />
              <span className="text-xs font-semibold text-white block">Offline Ready</span>
              <span className="text-[10px] text-gray-400">View members & check-in</span>
            </div>
            <div className="p-3 rounded-xl bg-[#1B1E24] border border-[#252830]">
              <ShieldCheck className="w-4 h-4 text-cyan-400 mx-auto mb-1.5" />
              <span className="text-xs font-semibold text-white block">Full Screen</span>
              <span className="text-[10px] text-gray-400">No browser address bar</span>
            </div>
          </div>

          {/* Platform Installation Guide */}
          <div>
            <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2.5">
              Step-by-Step Installation Instructions
            </div>

            {/* Platform Selector Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-[#111317] rounded-xl border border-[#252830] mb-3">
              <button
                type="button"
                onClick={() => setSelectedTab("Android")}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  selectedTab === "Android"
                    ? "bg-amber-500 text-black font-semibold shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTab("iOS")}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  selectedTab === "iOS"
                    ? "bg-amber-500 text-black font-semibold shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>iPhone / iPad</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTab("Windows")}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  selectedTab === "Windows" || selectedTab === "macOS" || selectedTab === "Linux"
                    ? "bg-amber-500 text-black font-semibold shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>PC & Mac</span>
              </button>
            </div>

            {/* Step Guides per Platform */}
            <div className="p-4 rounded-xl bg-[#111317] border border-[#252830] space-y-3">
              {selectedTab === "Android" && (
                <div className="space-y-2.5 text-xs text-gray-300">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      Open <strong>Chrome</strong>, <strong>Brave</strong>, or <strong>Edge</strong> on your phone.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      Tap the <strong>three dots (⋮)</strong> menu in the top right corner.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      Tap <strong>&ldquo;Install app&rdquo;</strong> or <strong>&ldquo;Add to Home screen&rdquo;</strong>.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      4
                    </span>
                    <div>
                      Tap <strong>Install</strong>. The BSF GYM app icon will be added to your mobile home screen!
                    </div>
                  </div>
                </div>
              )}

              {selectedTab === "iOS" && (
                <div className="space-y-2.5 text-xs text-gray-300">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      Open this website in <strong>Safari</strong> on your iPhone or iPad.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>Tap the <strong>Share</strong> button</span>
                      <Share className="w-3.5 h-3.5 text-amber-400 inline" />
                      <span>at the bottom of your screen.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      4
                    </span>
                    <div>
                      Tap <strong>&ldquo;Add&rdquo;</strong> in the top-right corner. You can now launch BSF GYM directly like a native iOS app!
                    </div>
                  </div>
                </div>
              )}

              {(selectedTab === "Windows" || selectedTab === "macOS" || selectedTab === "Linux") && (
                <div className="space-y-2.5 text-xs text-gray-300">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      Look at the right side of your browser URL address bar for the <strong>Install icon</strong> (computer monitor with down arrow).
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      Alternatively, click the browser menu <strong>(⋮)</strong> &rarr; <strong>&ldquo;Save and share&rdquo;</strong> &rarr; <strong>&ldquo;Install BSF THE GYM&rdquo;</strong>.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      Click <strong>Install</strong> to run BSF THE GYM as a standalone desktop application on your PC/Mac.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#252830] bg-[#111317]">
          <div className="text-[11px] text-gray-400">
            Powered by Next.js & Progressive Web App (PWA)
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#252830] hover:bg-[#2F333D] text-gray-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
