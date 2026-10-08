/** One web address or one email. A second address, a line break, or another scheme is not a link. */
export function oneExternalUrl(value: string): string | null {
  const href = String(value ?? "").trim();
  if (!href || /[\u0000-\u0020\u007f]/.test(href)) return null;
  if (/^mailto:[^<>"]+$/i.test(href)) return href;
  if (!/^https?:\/\//i.test(href)) return null;
  try {
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return href;
  } catch {
    return null;
  }
}

export function isHttpUrl(value: string): boolean {
  const href = oneExternalUrl(value);
  return Boolean(href && /^https?:\/\//i.test(href));
}

export function isOpenableUrl(value: string): boolean {
  return oneExternalUrl(value) !== null;
}

/** A link stored on the page: one web address, one email, or an in-page anchor. */
export function isStoredLink(value: string): boolean {
  const href = String(value ?? "").trim();
  if (!href || /[\u0000-\u0020\u007f]/.test(href)) return false;
  if (href.startsWith("#")) return !href.startsWith("#//") && !/[:\\]/.test(href);
  return isOpenableUrl(href);
}
