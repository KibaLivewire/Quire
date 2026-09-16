export type PrintWarning = {
  textMayVanish: boolean;
  heavyInk: boolean;
  coverage: number;
  reasons: string[];
};

function parseRgb(value: string): [number, number, number] | null {
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const m = value.match(/rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)/i);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function linear(channel: number) {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(rgb: [number, number, number]) {
  return 0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
}

function contrast(a: [number, number, number], b: [number, number, number]) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

function isColorPixel(r: number, g: number, b: number, a: number) {
  if (a < 16) return false;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  return lum < 0.92 || chroma > 18;
}

function walkTextContrast(root: HTMLElement): boolean {
  const paper = parseRgb(getComputedStyle(root).backgroundColor) || [255, 255, 255];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = node.textContent?.replace(/\s+/g, " ").trim();
    const parent = node.parentElement;
    node = walker.nextNode();
    if (!text || !parent) continue;
    const style = getComputedStyle(parent);
    if (style.visibility === "hidden" || style.display === "none") continue;
    const ink = parseRgb(style.color);
    if (!ink) continue;
    let bg = parseRgb(style.backgroundColor);
    if (!bg || style.backgroundColor === "transparent" || style.backgroundColor === "rgba(0, 0, 0, 0)") bg = paper;
    if (contrast(ink, bg) < 2.6) return true;
  }
  return false;
}

function sampleCoverage(root: HTMLElement, paper: string): number {
  const rect = root.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return 0;
  const canvas = document.createElement("canvas");
  const w = 160;
  const h = Math.max(8, Math.round((rect.height / rect.width) * w));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;
  ctx.fillStyle = paper || "#ffffff";
  ctx.fillRect(0, 0, w, h);
  const images = Array.from(root.querySelectorAll("img"));
  for (const img of images) {
    if (!img.complete || img.naturalWidth < 1) continue;
    const box = img.getBoundingClientRect();
    const x = ((box.left - rect.left) / rect.width) * w;
    const y = ((box.top - rect.top) / rect.height) * h;
    const iw = (box.width / rect.width) * w;
    const ih = (box.height / rect.height) * h;
    try {
      ctx.drawImage(img, x, y, iw, ih);
    } catch {
      ctx.fillStyle = "rgb(80,80,80)";
      ctx.fillRect(x, y, iw, ih);
    }
  }
  const { data } = ctx.getImageData(0, 0, w, h);
  let colored = 0;
  const total = w * h;
  for (let i = 0; i < data.length; i += 4) {
    if (isColorPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) colored += 1;
  }
  return colored / total;
}

export function assessPrintSheet(root: HTMLElement | null, paper: string, ink: string): PrintWarning {
  const reasons: string[] = [];
  if (!root) {
    return { textMayVanish: false, heavyInk: false, coverage: 0, reasons };
  }
  const paperRgb = parseRgb(paper) || parseRgb(getComputedStyle(root).backgroundColor) || [255, 255, 255];
  const inkRgb = parseRgb(ink) || parseRgb(getComputedStyle(root).color) || [28, 25, 23];
  const textMayVanish = contrast(paperRgb, inkRgb) < 2.6 || walkTextContrast(root);
  const coverage = sampleCoverage(root, paper || "#ffffff");
  const heavyInk = coverage > 0.8;
  if (textMayVanish) reasons.push("Some text sits too close to the paper color and may not appear.");
  if (heavyInk) {
    reasons.push(`More than 80% of this page is color (${Math.round(coverage * 100)}%). Printing it will use a lot of ink.`);
  }
  return { textMayVanish, heavyInk, coverage, reasons };
}

export function pageColors() {
  if (typeof document === "undefined") {
    return { paper: "#ffffff", ink: "#1c1917" };
  }
  const style = getComputedStyle(document.documentElement);
  const paper = style.getPropertyValue("--color-paper-raised").trim() || "#ffffff";
  const ink = style.getPropertyValue("--color-ink").trim() || "#1c1917";
  return { paper, ink };
}
