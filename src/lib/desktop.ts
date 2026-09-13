import { version as PACKAGE_VERSION } from "../../package.json";

type QuireBridge = {
  version?: () => Promise<string>;
  openExternal?: (url: string) => Promise<void>;
  checkUpdates?: () => Promise<{ current: string; latest: string | null; url?: string; error?: string }>;
};

declare global {
  interface Window {
    quire?: QuireBridge;
  }
}

/** Prefer Electron's baked version when the bridge is ready; fall back to package.json. */
let cachedVersion = PACKAGE_VERSION;

export function appVersion(): string {
  return cachedVersion;
}

/** Refresh from Electron so About / shelf match the installed build. */
export function hydrateAppVersion(): void {
  if (typeof window === "undefined" || !window.quire?.version) return;
  void window.quire.version().then((value) => {
    if (value?.trim()) cachedVersion = value.trim();
  });
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value, "https://quire.local");
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function openExternal(href: string): Promise<void> {
  const url = href.trim();
  if (!url || !isHttpUrl(url)) return;
  if (typeof window !== "undefined" && window.quire?.openExternal) {
    await window.quire.openExternal(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function checkForUpdates() {
  if (typeof window !== "undefined" && window.quire?.checkUpdates) {
    return window.quire.checkUpdates();
  }
  return { current: appVersion(), latest: appVersion() as string | null };
}
