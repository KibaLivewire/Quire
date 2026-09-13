export type ImageFilter = "none" | "grayscale" | "sepia" | "warm" | "cool" | "contrast";

export type ImageAdjust = {
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  brightness: number;
  contrast: number;
  saturate: number;
  filter: ImageFilter;
  aspect: "free" | "square" | "4:3" | "16:9";
};

export const DEFAULT_ADJUST: ImageAdjust = {
  rotate: 0,
  flipH: false,
  flipV: false,
  brightness: 100,
  contrast: 100,
  saturate: 100,
  filter: "none",
  aspect: "free",
};

export function isGifSrc(src: string) {
  return /image\/gif/i.test(src) || /^data:image\/gif/i.test(src) || /\.gif(?:$|\?)/i.test(src);
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load that image."));
    img.src = src;
  });
}

function cropRect(width: number, height: number, aspect: ImageAdjust["aspect"]) {
  if (aspect === "free") return { x: 0, y: 0, w: width, h: height };
  const ratio = aspect === "square" ? 1 : aspect === "4:3" ? 4 / 3 : 16 / 9;
  let w = width;
  let h = w / ratio;
  if (h > height) {
    h = height;
    w = h * ratio;
  }
  return { x: (width - w) / 2, y: (height - h) / 2, w, h };
}

export function cssFilter(adj: ImageAdjust): string {
  const parts = [
    `brightness(${adj.brightness}%)`,
    `contrast(${adj.contrast}%)`,
    `saturate(${adj.saturate}%)`,
  ];
  if (adj.filter === "grayscale") parts.push("grayscale(1)");
  if (adj.filter === "sepia") parts.push("sepia(0.7)");
  if (adj.filter === "warm") parts.push("sepia(0.25)", "saturate(1.15)");
  if (adj.filter === "cool") parts.push("hue-rotate(190deg)", "saturate(0.85)");
  if (adj.filter === "contrast") parts.push("contrast(1.25)", "saturate(1.1)");
  return parts.join(" ");
}

export function cssTransform(adj: ImageAdjust): string {
  return `rotate(${adj.rotate}deg) scale(${adj.flipH ? -1 : 1}, ${adj.flipV ? -1 : 1})`;
}

export function editStyle(adj: ImageAdjust): string {
  return `filter:${cssFilter(adj)};transform:${cssTransform(adj)}`;
}

export async function renderEditedImage(src: string, adj: ImageAdjust): Promise<string> {
  if (isGifSrc(src)) {
    throw new Error("gif");
  }
  const img = await loadHtmlImage(src);
  const crop = cropRect(img.naturalWidth, img.naturalHeight, adj.aspect);
  const rotated = adj.rotate === 90 || adj.rotate === 270;
  const outW = Math.max(1, Math.round(rotated ? crop.h : crop.w));
  const outH = Math.max(1, Math.round(rotated ? crop.w : crop.h));
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not edit that image.");
  ctx.filter = cssFilter(adj);
  ctx.translate(outW / 2, outH / 2);
  ctx.rotate((adj.rotate * Math.PI) / 180);
  ctx.scale(adj.flipH ? -1 : 1, adj.flipV ? -1 : 1);
  ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, -crop.w / 2, -crop.h / 2, crop.w, crop.h);
  const png = /image\/png/i.test(src) || src.startsWith("data:image/png");
  return png ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.9);
}
