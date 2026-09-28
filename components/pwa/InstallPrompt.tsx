// components/pwa/InstallPrompt.tsx — Install Banner for PWA (Android / Chrome / iOS) with telemetry
"use client";

import React, { useState, useEffect } from "react";
import { Download, X, Share } from "lucide-react";
import { usePwaTelemetry } from "@/lib/pwa/usePwaTelemetry";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);
  const { track } = usePwaTelemetry();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if app is already running in standalone mode (installed)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      return;
    }

    // Check if dismissed in this session
    const dismissed = sessionStorage.getItem("bsf_pwa_dismissed");
    if (dismissed) {
      return;
    }
    setIsDismissed(false);

    // 1. Android / Chrome / Edge: Catch beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      (window as unknown as { __bsf_deferred_prompt?: Event }).__bsf_deferred_prompt = e;
      window.dispatchEvent(new CustomEvent("bsf-pwa-prompt-available"));
      setIsVisible(true);
      track("INSTALL_PROMPT_SHOWN");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 2. iOS Safari detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari =
      isIosDevice &&
      /webkit/.test(userAgent) &&
      !/crios|fxios|opios|mercury/.test(userAgent);

    if (isSafari && !isStandalone) {
      setIsIOS(true);
      // Wait a moment before showing on iOS
      const timer = setTimeout(() => {
        setIsVisible(true);
        track("INSTALL_PROMPT_SHOWN");
      }, 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        track("INSTALL_ACCEPTED");
        setIsVisible(false);
      } else {
        track("INSTALL_DISMISSED");
        handleDismiss();
      }
    } catch (err) {
      console.error("[PWA] Installation prompt error:", err);
    } finally {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem("bsf_pwa_dismissed", "true");
    if (!isIOS) track("INSTALL_DISMISSED");
  };

  if (!isVisible || isDismissed) {
    return null;
  }

  return (
    <aside
      aria-label="Install BSF GYM application"
      className="fixed bottom-5 right-5 left-5 sm:left-auto sm:w-96 z-50 bg-[#16181D] border border-amber-500/30 rounded-2xl shadow-2xl p-4 text-white animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-start gap-3">
        {/* App Icon preview */}
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6.5 6.5h11M6.5 17.5h11M4 12h16M4 8.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5ZM20 8.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5ZM4 20.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5ZM20 20.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-gray-100 tracking-tight">
              Install BSF THE GYM
            </h2>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss install prompt"
              className="text-gray-400 hover:text-gray-200 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
            Install the app for faster 1-tap launch, offline view, and full screen experience.
          </p>

          {isIOS ? (
            <div className="mt-3 pt-2.5 border-t border-gray-800 text-[11px] text-amber-300/90 flex items-center gap-1.5 font-medium">
              <span>Tap</span>
              <Share className="w-3.5 h-3.5 text-amber-400 inline" />
              <span>Share and select</span>
              <strong className="text-amber-300">Add to Home Screen</strong>
            </div>
          ) : deferredPrompt ? (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Install App
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-800 text-gray-300 text-xs font-medium transition-colors"
              >
                Not Now
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
