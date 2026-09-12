import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AMP = "\u0026";

export function plainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<img[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(new RegExp(`${AMP}nbsp;`, "gi"), " ")
    .replace(new RegExp(`${AMP}amp;`, "gi"), AMP)
    .replace(new RegExp(`${AMP}lt;`, "gi"), "<")
    .replace(new RegExp(`${AMP}gt;`, "gi"), ">")
    .replace(new RegExp(`${AMP}quot;`, "gi"), '"')
    .replace(new RegExp(`${AMP}#39;`, "gi"), "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function wordCount(html: string): number {
  const text = plainText(html);
  if (!text) return 0;
  return text.split(/\s+/).length;
}

export function debounce<Args extends unknown[]>(fn: (...args: Args) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: Args | undefined;
  function wrapped(...args: Args) {
    lastArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, ms);
  }
  wrapped.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
  };
  wrapped.flush = () => {
    if (!timer || !lastArgs) return;
    clearTimeout(timer);
    timer = undefined;
    fn(...lastArgs);
  };
  return wrapped;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll(AMP, `${AMP}amp;`)
    .replaceAll("<", `${AMP}lt;`)
    .replaceAll(">", `${AMP}gt;`)
    .replaceAll('"', `${AMP}quot;`);
}
