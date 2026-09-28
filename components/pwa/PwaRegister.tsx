// components/pwa/PwaRegister.tsx — Service Worker Registration & Update Handler with Telemetry
"use client";

import { useEffect } from "react";
import { usePwaTelemetry } from "@/lib/pwa/usePwaTelemetry";

export function PwaRegister() {
  const { track } = usePwaTelemetry();

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Track session start (once per page load)
    track("SESSION_START");

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        // Check for updates on page load and listen for new worker
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener("statechange", () => {
            if (
              installingWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              track("UPDATE_AVAILABLE");
              // Auto-activate new service worker
              installingWorker.postMessage({ type: "SKIP_WAITING" });
              track("UPDATE_ACCEPTED");
            }
          });
        });

        // Reload page when active service worker changes
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });
      } catch (error) {
        console.error("[PWA] Service worker registration failed:", error);
      }
    };

    window.addEventListener("load", registerSW);

    // Track connectivity state changes
    const handleOffline = () => track("OFFLINE_DETECTED");
    const handleOnline = () => track("ONLINE_RESTORED");
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("load", registerSW);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
