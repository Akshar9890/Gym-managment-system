import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.akshar.bsfgym",
  appName: "BSF THE GYM",
  webDir: "public",
  server: {
    // Points directly to the live production deployment on Vercel
    url: "https://gym-managment-system-eight.vercel.app",
    cleartext: true,
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: "#0B0C0E",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      spinnerColor: "#F59E0B",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK" as any,
      backgroundColor: "#0B0C0E",
      overlaysWebView: false,
    },
    Keyboard: {
      resize: "body" as any,
      style: "DARK" as any,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
