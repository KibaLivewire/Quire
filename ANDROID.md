# Quire for Android

Quire on a phone is the same notebook: pages stay on the device. This folder
builds a real Android app with Capacitor.

## What you need on the PC

1. [Android Studio](https://developer.android.com/studio) (includes the Android SDK)
2. Node.js (the same one you used for the Windows app)
3. A phone with USB debugging, or the Studio emulator

## Build the APK

In PowerShell, in your Quire folder:

```powershell
cd C:\Users\Ultim\Documents\quire
git pull
npm install
npm run build:android
npx cap open android
```

Android Studio opens the `android` folder. Then:

1. Wait until Gradle finishes syncing
2. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. Install on a phone with **Run** (green play), or find the APK under
   `android\app\build\outputs\apk\debug\app-debug.apk`

To put it on the Play Store later, use **Build → Generate Signed Bundle / APK**
and pick Android App Bundle (`.aab`).

## Phone notes

- Insert image offers the camera or the gallery
- Export and backup use Android’s share sheet
- The back key leaves the page list, then the app
- Wind chimes, Quill, and Focus work the same as on the PC
