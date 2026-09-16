import { isNativeApp } from "./native";

export type DeviceKind = "phone" | "tablet" | "desktop";

export type DeviceProfile = {
  kind: DeviceKind;
  native: boolean;
  coarse: boolean;
  width: number;
  height: number;
  portrait: boolean;
};

export function readDevice(): DeviceProfile {
  if (typeof window === "undefined") {
    return { kind: "desktop", native: false, coarse: false, width: 1280, height: 800, portrait: false };
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const native = isNativeApp();
  let kind: DeviceKind = "desktop";
  if (width < 768 || (native && width < 840)) kind = "phone";
  else if (width < 1100 || (native && width < 1200)) kind = "tablet";
  return {
    kind,
    native,
    coarse: coarse || native,
    width,
    height,
    portrait: height >= width,
  };
}

export function applyDevice(profile: DeviceProfile = readDevice()) {
  if (typeof document === "undefined") return profile;
  const root = document.documentElement;
  root.dataset.device = profile.kind;
  root.dataset.native = profile.native ? "true" : "false";
  root.dataset.orientation = profile.portrait ? "portrait" : "landscape";
  return profile;
}

export function pageFitScale(
  availWidth: number,
  availHeight: number,
  pageWidthIn: number,
  pageHeightIn: number,
  kind: DeviceKind,
) {
  const dpi = 96;
  const pageW = Math.max(1, pageWidthIn) * dpi;
  const pageH = Math.max(1, pageHeightIn) * dpi;
  const gutter = kind === "phone" ? 20 : kind === "tablet" ? 36 : 56;
  const widthScale = (availWidth - gutter) / pageW;
  const heightScale = (availHeight - gutter) / pageH;
  const raw = Math.min(widthScale, heightScale);
  const cap = kind === "desktop" ? 1 : 1.08;
  const floor = kind === "phone" ? 0.22 : 0.28;
  if (!Number.isFinite(raw) || raw <= 0) return kind === "phone" ? 0.42 : 1;
  return Math.min(cap, Math.max(floor, raw));
}

if (typeof window !== "undefined") applyDevice();

