const APP_VERSION = "1.3.0";

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

export function appVersion(): string {
  return APP_VERSION;
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
  return { current: APP_VERSION, latest: APP_VERSION as string | null };
}
