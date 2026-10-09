/** A sheet that is not text becomes a blank sheet. It does not throw, and it does not move the others. */
export function coercePages(pages: unknown, fallback = ""): string[] {
  if (!Array.isArray(pages) || pages.length === 0) return [typeof fallback === "string" ? fallback : ""];
  return pages.map((page) => (typeof page === "string" ? page : ""));
}

/** Replace a sheet that is already in the notebook. A stale index must not add one. */
export function replaceExistingPage(pages: string[], pageIndex: number, html: string): string[] | null {
  if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= pages.length) return null;
  const next = pages.slice();
  next[pageIndex] = html;
  return next;
}
