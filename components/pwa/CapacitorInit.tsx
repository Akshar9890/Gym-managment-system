// components/pwa/CapacitorInit.tsx — Handles native mobile lifecycle, back button, and status bar
"use client";

import { useEffect } from "react";

export function CapacitorInit() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initCapacitor = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        // 1. Configure Status Bar
        try {
          const { StatusBar, Style } = await import("@capacitor/status-bar");
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: "#0B0C0E" });
        } catch (e) {
          console.warn("[Capacitor] StatusBar init warning:", e);
        }

        // 2. Hide Splash Screen smoothly
        try {
          const { SplashScreen } = await import("@capacitor/splash-screen");
          await SplashScreen.hide({ fadeOutDuration: 300 });
        } catch (e) {
          console.warn("[Capacitor] SplashScreen init warning:", e);
        }

        // 3. Android Hardware Back Button navigation
        try {
          const { App } = await import("@capacitor/app");
          App.addListener("backButton", ({ canGoBack }) => {
            if (canGoBack && window.location.pathname !== "/" && window.location.pathname !== "/dashboard") {
              window.history.back();
            } else {
              App.exitApp();
            }
          });
        } catch (e) {
          console.warn("[Capacitor] BackButton listener warning:", e);
        }
      } catch (err) {
        console.warn("[Capacitor] Not running in native context:", err);
      }
    };

    initCapacitor();
  }, []);

  return null;
}
