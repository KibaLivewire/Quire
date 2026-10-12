/** Keep in step with src/lib/open-url.ts. The shell only receives one web address or one email. */
const BREAKS = /[\u0000-\u0020\u007f\u0085\u2028\u2029\ufeff]/;

function mailHeaderBreak(href) {
  return /%0[09a-d]/i.test(href) || /%(?:c2%85|e2%80%a8|e2%80%a9)/i.test(href);
}

function oneExternalUrl(value) {
  const href = String(value ?? "").trim();
  if (!href || BREAKS.test(href)) return null;
  if (/^mailto:/i.test(href)) {
    if (!/^mailto:[^<>"]+$/i.test(href)) return null;
    if (mailHeaderBreak(href)) return null;
    return href;
  }
  if (!/^https?:\/\//i.test(href)) return null;
  try {
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

module.exports = { oneExternalUrl };
