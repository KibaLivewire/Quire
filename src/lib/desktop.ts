import { version as PACKAGE_VERSION } from "../../package.json";
import type { Prefs } from "./types";
import { isNativeApp, openNativeUrl } from "./native";
import { isHttpUrl as parseHttpUrl, isOpenableUrl as parseOpenableUrl } from "./open-url";

type QuireBridge = {
  version?: () => Promise<string>;
  openExternal?: (url: string) => Promise<void>;
  checkUpdates?: () => Promise<{ current: string; latest: string | null; url?: string; error?: string }>;
  readPrefs?: () => Promise<Partial<Prefs> | null>;
  writePrefs?: (prefs: Prefs | Partial<Prefs>) => Promise<boolean>;
  onFlushRequest?: (handler: () => void | Promise<void>) => () => void;
  notifyFlushDone?: (ok?: boolean) => void;
  addSpellWord?: (word: string) => Promise<boolean>;
  removeSpellWord?: (word: string) => Promise<boolean>;
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

export { isStoredLink } from "./open-url";

export function isHttpUrl(value: string): boolean {
  return parseHttpUrl(value);
}

export function isOpenableUrl(value: string): boolean {
  return parseOpenableUrl(value);
}

export async function openExternal(href: string): Promise<void> {
  const url = href.trim();
  if (!url || !isOpenableUrl(url)) return;
  if (typeof window !== "undefined" && window.quire?.openExternal) {
    await window.quire.openExternal(url);
    return;
  }
  if (isNativeApp()) {
    await openNativeUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function parseVersionParts(tag: string) {
  const raw = String(tag || "")
    .trim()
    .replace(/^v/i, "");
  const match = raw.match(/^(\d+(?:\.\d+)*)(.*)$/);
  const core = match?.[1] || "0";
  const suffix = (match?.[2] || "").replace(/^[-.+]/, "");
  const nums = core.split(".").map((n) => Number.parseInt(n, 10) || 0);
  return { nums, suffix };
}

export function isNewerVersion(latest: string | null | undefined, current: string) {
  if (!latest) return false;
  const a = parseVersionParts(latest);
  const b = parseVersionParts(current);
  const len = Math.max(a.nums.length, b.nums.length);
  for (let i = 0; i < len; i += 1) {
    if ((a.nums[i] || 0) > (b.nums[i] || 0)) return true;
    if ((a.nums[i] || 0) < (b.nums[i] || 0)) return false;
  }
  if (!a.suffix && b.suffix) return true;
  if (a.suffix && !b.suffix) return false;
  return a.suffix.localeCompare(b.suffix) > 0;
}

export async function checkForUpdates() {
  if (typeof window !== "undefined" && window.quire?.checkUpdates) {
    return window.quire.checkUpdates();
  }
  return { current: appVersion(), latest: appVersion() as string | null };
}

/** Durable prefs mirror under Electron userData (survives IDB quirks on quit). */
export async function readDesktopPrefs(): Promise<Partial<Prefs> | null> {
  if (typeof window === "undefined" || !window.quire?.readPrefs) return null;
  try {
    const value = await window.quire.readPrefs();
    if (!value || typeof value !== "object") return null;
    return value;
  } catch {
    return null;
  }
}

export async function writeDesktopPrefs(prefs: Prefs | Partial<Prefs>): Promise<void> {
  if (typeof window === "undefined" || !window.quire?.writePrefs) return;
  try {
    await window.quire.writePrefs(prefs);
  } catch {
    /* offline / non-electron is fine */
  }
}

/** Packaged Electron asks the renderer to flush before closing the window. */
export function onDesktopFlushRequest(handler: () => void | Promise<void>): () => void {
  if (typeof window === "undefined" || !window.quire?.onFlushRequest) return () => {};
  return window.quire.onFlushRequest(handler);
}

export function notifyDesktopFlushDone(ok = true): void {
  if (typeof window === "undefined" || !window.quire?.notifyFlushDone) return;
  window.quire.notifyFlushDone(ok);
}
