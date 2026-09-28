// lib/pwa/usePwaTelemetry.ts — Lightweight client-side PWA telemetry hook
"use client";

import { useCallback, useRef, useEffect } from "react";

export type PwaEvent =
  | "SESSION_START"
  | "INSTALL_PROMPT_SHOWN"
  | "INSTALL_ACCEPTED"
  | "INSTALL_DISMISSED"
  | "OFFLINE_DETECTED"
  | "ONLINE_RESTORED"
  | "OFFLINE_QUEUE_SYNCED"
  | "UPDATE_AVAILABLE"
  | "UPDATE_ACCEPTED";

function detectPlatform(): string {
  if (typeof navigator === "undefined") return "Unknown";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/win/i.test(ua)) return "Windows";
  if (/mac/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Other";
}

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function getOrCreateSessionId(): string {
  if (typeof sessionStorage === "undefined") return "ssr";
  let id = sessionStorage.getItem("bsf_pwa_session_id");
  if (!id) {
    id = `pwa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem("bsf_pwa_session_id", id);
  }
  return id;
}

export function usePwaTelemetry() {
  const platform = useRef<string>("Unknown");
  const standalone = useRef<boolean>(false);
  const sessionId = useRef<string>("ssr");

  useEffect(() => {
    platform.current = detectPlatform();
    standalone.current = isStandaloneMode();
    sessionId.current = getOrCreateSessionId();
  }, []);

  const track = useCallback(
    (event: PwaEvent, metadata?: Record<string, unknown>) => {
      const payload = {
        event,
        platform: platform.current,
        isStandalone: standalone.current,
        sessionId: sessionId.current,
        ...(metadata ? { metadata } : {}),
      };

      // Prefer sendBeacon (survives page unloads); fall back to fetch
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/pwa/telemetry",
          new Blob([JSON.stringify(payload)], { type: "application/json" })
        );
      } else {
        fetch("/api/pwa/telemetry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {
          // Fire-and-forget — never block the user
        });
      }
    },
    []
  );

  return { track };
}
