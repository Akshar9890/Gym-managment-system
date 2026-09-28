// lib/pwa/usePwaInstall.ts — Hook for managing PWA installation and device detection
"use client";

import { useState, useEffect, useCallback } from "react";
import { usePwaTelemetry } from "./usePwaTelemetry";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export type PlatformType = "Android" | "iOS" | "macOS" | "Windows" | "Linux" | "Unknown";

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [platform, setPlatform] = useState<PlatformType>("Unknown");
  const [isReady, setIsReady] = useState(false);
  const { track } = usePwaTelemetry();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect standalone display mode (already installed or running inside native Capacitor app)
    const checkStandalone = () => {
      const isCapacitor = Boolean(
        (window as any).Capacitor?.isNativePlatform?.() ||
        (window as any).Capacitor !== undefined
      );
      const standalone =
        isCapacitor ||
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsStandalone(standalone);
    };
    checkStandalone();

    // Detect Platform
    const ua = navigator.userAgent.toLowerCase();
    if (/android/i.test(ua)) setPlatform("Android");
    else if (/iphone|ipad|ipod/i.test(ua)) setPlatform("iOS");
    else if (/macintosh|mac os x/i.test(ua)) setPlatform("macOS");
    else if (/windows/i.test(ua)) setPlatform("Windows");
    else if (/linux/i.test(ua)) setPlatform("Linux");
    else setPlatform("Unknown");

    // Check if an existing prompt was captured globally
    if ((window as unknown as { __bsf_deferred_prompt?: BeforeInstallPromptEvent }).__bsf_deferred_prompt) {
      setDeferredPrompt(
        (window as unknown as { __bsf_deferred_prompt?: BeforeInstallPromptEvent }).__bsf_deferred_prompt || null
      );
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      (window as unknown as { __bsf_deferred_prompt?: BeforeInstallPromptEvent }).__bsf_deferred_prompt = promptEvent;
      setDeferredPrompt(promptEvent);
      setIsReady(true);
    };

    const handleCustomPromptEvent = () => {
      if ((window as unknown as { __bsf_deferred_prompt?: BeforeInstallPromptEvent }).__bsf_deferred_prompt) {
        setDeferredPrompt(
          (window as unknown as { __bsf_deferred_prompt?: BeforeInstallPromptEvent }).__bsf_deferred_prompt || null
        );
      }
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      (window as unknown as { __bsf_deferred_prompt?: BeforeInstallPromptEvent | null }).__bsf_deferred_prompt = null;
      track("INSTALL_ACCEPTED");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("bsf-pwa-prompt-available", handleCustomPromptEvent);
    window.addEventListener("appinstalled", handleAppInstalled);

    setIsReady(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("bsf-pwa-prompt-available", handleCustomPromptEvent);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [track]);

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "unsupported"> => {
    const prompt =
      deferredPrompt ||
      (typeof window !== "undefined"
        ? (window as unknown as { __bsf_deferred_prompt?: BeforeInstallPromptEvent }).__bsf_deferred_prompt
        : null);

    if (!prompt) {
      return "unsupported";
    }

    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") {
        track("INSTALL_ACCEPTED");
        setDeferredPrompt(null);
        if (typeof window !== "undefined") {
          (window as unknown as { __bsf_deferred_prompt?: null }).__bsf_deferred_prompt = null;
        }
        return "accepted";
      } else {
        track("INSTALL_DISMISSED");
        return "dismissed";
      }
    } catch (err) {
      console.error("[PWA] Prompt error:", err);
      return "unsupported";
    }
  }, [deferredPrompt, track]);

  return {
    canInstall: Boolean(deferredPrompt),
    isStandalone,
    platform,
    isReady,
    promptInstall,
  };
}
