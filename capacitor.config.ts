import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.kibalivewire.quire",
  appName: "Quire",
  webDir: "android-www",
  android: {
    allowMixedContent: true,
    backgroundColor: "#1a1714",
  },
  plugins: {
    StatusBar: {
      style: "DARK",
      backgroundColor: "#1a1714",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
