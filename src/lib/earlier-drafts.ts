import { isPageEmpty } from "./pages";
import type { PageDraft } from "./types";
import { plainText } from "./utils";

export const DRAFT_IDLE_MS = 45_000;
export const DRAFT_PERIODIC_MS = 5 * 60_000;
export const MAX_DRAFTS_PER_PAGE = 20;
export const DRAFT_SNIFF_CHARS = 80;
/** Skip autosave when HTML is roughly this large (chars ≈ bytes for ASCII-heavy HTML). */
export const DRAFT_MAX_HTML_CHARS = 500 * 1024;

const hugeToastShown = new Set<string>();

export function draftSniff(html: string, max = DRAFT_SNIFF_CHARS): string {
  const text = plainText(html);
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function softCapDrafts(drafts: PageDraft[], max = MAX_DRAFTS_PER_PAGE): PageDraft[] {
  if (drafts.length <= max) return drafts;
  // Newest first; drop oldest (tail)
  return drafts.slice(0, max);
}

export function makePageDraft(
  html: string,
  source: PageDraft["source"],
  createdAt = Date.now(),
): PageDraft {
  return {
    id: crypto.randomUUID(),
    createdAt,
    html,
    source,
    sniff: draftSniff(html),
  };
}

export function shouldSkipDraft(html: string): boolean {
  return isPageEmpty(html);
}

export function isDraftHtmlTooLarge(html: string): boolean {
  return html.length > DRAFT_MAX_HTML_CHARS;
}

/** One-time toast key per note/page for oversized autosave skips. */
export function shouldToastHugeDraft(noteId: string, pageIndex: number): boolean {
  const key = `${noteId}:${pageIndex}`;
  if (hugeToastShown.has(key)) return false;
  hugeToastShown.add(key);
  return true;
}

export function draftMatchesLatest(drafts: PageDraft[] | undefined, html: string): boolean {
  const latest = drafts?.[0];
  return Boolean(latest && latest.html === html);
}

export function relativeDraftTime(createdAt: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - createdAt) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return days === 1 ? "1 day ago" : `${days} days ago`;
  const months = Math.round(days / 30);
  if (months < 12) return months === 1 ? "1 month ago" : `${months} months ago`;
  const years = Math.round(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export function normalizeDrafts(value: unknown): PageDraft[] {
  if (!Array.isArray(value)) return [];
  const out: PageDraft[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.html !== "string") continue;
    const source = row.source === "manual" || row.source === "pre-restore" || row.source === "auto" ? row.source : "auto";
    out.push({
      id: row.id,
      createdAt: typeof row.createdAt === "number" ? row.createdAt : Date.now(),
      html: row.html,
      source,
      sniff: typeof row.sniff === "string" ? row.sniff : draftSniff(row.html),
    });
  }
  return softCapDrafts(out);
}
