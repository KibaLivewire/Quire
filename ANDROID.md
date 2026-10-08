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

To put it on the Play Store, use **Build → Generate Signed App Bundle / APK**
and pick **Android App Bundle** (`.aab`). Do not upload the debug APK.

The signed file is:

`android\app\build\outputs\bundle\release\app-release.aab`

## Publish on Google Play

1. Open [Google Play Console](https://play.google.com/console) and create the app.
   The package name must be `com.kibalivewire.quire`. It cannot be changed later.
2. Play requires a public web page for the privacy policy. The text is
   [privacy.html](privacy.html) in this repo. Host that file at an `https://` address
   and paste that address into Play Console. A GitHub source link is not enough.
3. Complete **Data safety**: pages stay on the device. The camera is used only
   when inserting a picture. Quill can send a short passage to LanguageTool,
   Datamuse, or Wiktionary when the writer asks. There is no account and no ads.
4. Finish the store listing, content rating, and target audience.
5. Create a release (start with **Internal testing**), upload `app-release.aab`,
   and roll it out. The next upload must have a higher `versionCode`.
   `npm run build:android` sets that from `package.json` (`1.8.12` is `10812`).

## Phone notes

- Insert image offers the camera or the gallery
- Export and backup use Android’s share sheet
- The back key leaves the page list, then the app
- Wind chimes, Quill, and Focus work the same as on the PC
- File → Transfer to another device saves a zip you can restore on the phone or PC
- Rain theme and ink-saver print are in this build
