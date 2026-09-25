import type { Editor } from "@tiptap/react";

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.84;
const PASSTHROUGH_BYTES = 220_000;
const GIF_MAX_BYTES = 8_000_000;
const ALLOWED = /image\/(jpeg|jpg|png|gif|webp)/i;
const ALLOWED_EXT = /\.(jpe?g|png|gif|webp)$/i;

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp";

export function isAllowedImage(file: File): boolean {
  if (ALLOWED.test(file.type)) return true;
  if (file.type && file.type !== "application/octet-stream") return false;
  return ALLOWED_EXT.test(file.name);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function fileToDataUrl(file: File): Promise<string> {
  if (!isAllowedImage(file)) {
    throw new Error("Use a JPEG, PNG, GIF, or WebP image.");
  }
  const type = file.type || guessType(file.name);
  if (/gif/i.test(type)) {
    if (file.size > GIF_MAX_BYTES) {
      throw new Error("That GIF is too large to keep in motion. Use one under 8 MB.");
    }
    return readAsDataUrl(file);
  }
  if (file.size <= PASSTHROUGH_BYTES) return readAsDataUrl(file);

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return readAsDataUrl(file);
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  let keepPng = false;
  if (/png|webp/i.test(type)) {
    const pixels = ctx.getImageData(0, 0, width, height).data;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] < 255) {
        keepPng = true;
        break;
      }
    }
  }
  return keepPng ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

function guessType(name: string): string {
  if (/\.png$/i.test(name)) return "image/png";
  if (/\.gif$/i.test(name)) return "image/gif";
  if (/\.webp$/i.test(name)) return "image/webp";
  return "image/jpeg";
}

export async function insertImages(editor: Editor, files: File[]) {
  const images = files.filter(isAllowedImage);
  if (!images.length) {
    throw new Error("Use a JPEG, PNG, GIF, or WebP image.");
  }
  for (const file of images) {
    const src = await fileToDataUrl(file);
    const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
    editor.chain().focus().setImage({ src, alt }).run();
  }
}

export function collectImageFiles(list: FileList | File[] | null | undefined): File[] {
  if (!list) return [];
  return Array.from(list).filter(isAllowedImage);
}

export function selectedImageSrc(editor: Editor): string | null {
  if (!editor.isActive("image")) return null;
  const src = editor.getAttributes("image").src;
  return typeof src === "string" && src ? src : null;
}
