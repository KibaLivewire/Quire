import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AMP = "\u0026";
const AMP_MARK = "\uE000";

function characterFromCode(num: number): string {
  if (!Number.isInteger(num) || num <= 0 || num > 0x10ffff) return "";
  if (num === 38) return AMP_MARK;
  if (num >= 0xd800 && num <= 0xdfff) return "";
  return String.fromCodePoint(num);
}

const NAMED_SPACE = new Set([
  "ensp",
  "emsp",
  "emsp13",
  "emsp14",
  "numsp",
  "puncsp",
  "thinsp",
  "hairsp",
  "MediumSpace",
  "ThinSpace",
  "VeryThinSpace",
  "NonBreakingSpace",
]);

const NAMED_MARK: Record<string, string> = {
  shy: "\u00ad",
  mdash: "\u2014",
  ndash: "\u2013",
  dash: "\u2010",
  horbar: "\u2015",
  minus: "\u2212",
  hellip: "\u2026",
  lsquo: "\u2018",
  rsquo: "\u2019",
  ldquo: "\u201c",
  rdquo: "\u201d",
  bull: "\u2022",
  Tab: " ",
  NewLine: " ",
  ThickSpace: "\u205f\u200a",
};

/** Named marks, then numeric marks, then the ampersand. A written entity stays the letters the writer typed. */
export function decodeTextEntities(value: string): string {
  const named = value.replace(new RegExp(`${AMP}([A-Za-z][A-Za-z0-9]*);`, "g"), (all, name: string) => {
    if (NAMED_SPACE.has(name)) return " ";
    return NAMED_MARK[name] ?? all;
  });
  return named
    .replace(new RegExp(`${AMP}lt;`, "gi"), "<")
    .replace(new RegExp(`${AMP}gt;`, "gi"), ">")
    .replace(new RegExp(`${AMP}quot;`, "gi"), '"')
    .replace(new RegExp(`${AMP}apos;`, "gi"), "'")
    .replace(new RegExp(`${AMP}#39;`, "gi"), "'")
    .replace(new RegExp(`${AMP}nbsp;`, "gi"), " ")
    .replace(new RegExp(`${AMP}#x26;`, "gi"), AMP_MARK)
    .replace(new RegExp(`${AMP}#38;`, "gi"), AMP_MARK)
    .replace(new RegExp(`${AMP}#(\\d+);`, "g"), (_, digits: string) => characterFromCode(Number(digits)))
    .replace(new RegExp(`${AMP}#x([0-9a-fA-F]+);`, "gi"), (_, hex: string) => characterFromCode(Number.parseInt(hex, 16)))
    .replace(new RegExp(`${AMP}amp;`, "gi"), AMP)
    .replaceAll(AMP_MARK, AMP)
    .replace(/[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g, " ");
}

/** Same letter folding Find uses on the sheet. The computer's language must not disagree. */
export function foldDeskText(value: string): string {
  return value.toLocaleLowerCase("en-US");
}

export function plainText(html: string): string {
  return decodeTextEntities(
    html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<img[^>]*>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
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
