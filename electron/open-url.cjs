/** Keep in step with src/lib/open-url.ts. The shell only receives one web address or one email. */
function oneExternalUrl(value) {
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

module.exports = { oneExternalUrl };
