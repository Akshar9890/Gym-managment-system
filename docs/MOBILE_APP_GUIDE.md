# BSF THE GYM — Android & iOS Mobile Applications Guide

This repository contains fully configured, production-ready native **Android** and **iOS** mobile applications powered by **Capacitor**.

Both apps connect directly to your live production deployment on Vercel:
👉 **`https://gym-managment-system-eight.vercel.app`**

---

## 📁 Native Project Locations

| Platform | Directory | Primary File / Project |
| :--- | :--- | :--- |
| **Android** | `bsf-gym/android/` | Android Studio Project (`build.gradle`, `MainActivity.java`) |
| **iOS** | `bsf-gym/ios/App/` | Xcode Project & Workspace (`App.xcworkspace`, `Info.plist`) |

---

## ⚡ Quick NPM Commands

Run these commands from inside `bsf-gym`:

```bash
# Sync web configuration and native plugins to Android & iOS
npm run cap:sync

# Open Android Studio with the Android project
npm run cap:android

# Open Xcode with the iOS project
npm run cap:ios

# Build Android Debug APK directly with Gradle
npm run cap:build:android
```

---

## 🤖 Running the Android App

### Option A: Via Android Studio (Recommended)
1. Install [Android Studio](https://developer.android.com/studio) if not already installed.
2. Run `npm run cap:android` (or open the `bsf-gym/android` folder in Android Studio).
3. Wait for Gradle sync to complete.
4. Plug in your Android phone (with USB Debugging enabled) or start an Android Virtual Device (AVD).
5. Click the green **Run** (▶) button.
6. The app will install and launch with the official **BSF THE GYM** icon, native splash screen, and dark status bar!

### Option B: Build APK with Command Line
From the `bsf-gym` directory:
```bash
cd android
./gradlew assembleDebug
```
The compiled APK will be generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

Transfer this `.apk` to any Android phone to install immediately!

---

## 🍎 Running the iOS App

### Requirements
- A Mac running macOS.
- [Xcode](https://developer.apple.com/xcode/) installed from the Mac App Store.
- [CocoaPods](https://cocoapods.org/) or Swift Package Manager (Capacitor 7/8 uses Swift Package Manager natively).

### Steps
1. Run `npm run cap:ios` (or open `bsf-gym/ios/App/App.xcworkspace` in Xcode).
2. Select your target device (your connected iPhone or an iPhone Simulator).
3. In the **Signing & Capabilities** tab in Xcode:
   - Select your Apple Developer Team (or Personal Team for free testing on your device).
   - Bundle Identifier is: `com.bsfgym.app`.
4. Click **Run** (Cmd + R) to install and launch on your iPhone!

---

## 📱 Native Features Included

- **Native Status Bar:** Configured with BSF GYM dark theme (`#0B0C0E`) and light content icons.
- **Splash Screen:** Auto-shows official BSF THE GYM branding with amber progress spinner on launch.
- **Android Hardware Back Button:** Integrated navigation that navigates backward through pages and modals instead of closing the app.
- **Camera & Storage Permissions:** Configured in `AndroidManifest.xml` and `Info.plist` for taking member photos and uploading payment receipts/proofs.
- **Cleartext Traffic Enabled:** Supports testing against local development network servers (`http://192.168.x.x:3001`).
- **Icons & Branding:** High-resolution Android adaptive mipmaps and iOS AppIcon 1024x1024 configured.

---

## 🌐 Switching Target Server

If you ever wish to test the native app against your local dev server instead of production Vercel:

Edit `capacitor.config.ts`:
```ts
server: {
  // For local testing:
  url: "http://192.168.0.100:3001", // Your computer's local IP address
  cleartext: true,
}
```
Then run:
```bash
npm run cap:sync
```
