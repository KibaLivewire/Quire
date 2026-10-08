/** Replace a sheet that is already in the notebook. A stale index must not add one. */
export function replaceExistingPage(pages: string[], pageIndex: number, html: string): string[] | null {
  if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= pages.length) return null;
  const next = pages.slice();
  next[pageIndex] = html;
  return next;
}
