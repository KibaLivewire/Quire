/** Drop scripts and event handlers. Formatting, pictures, and Quire marks stay. */
export function sanitizeHtml(html: string): string {
  if (!html || typeof document === "undefined") return html;
  const root = document.createElement("div");
  root.innerHTML = html;
  root.querySelectorAll("script, iframe, object, embed, link, meta, base, style").forEach((el) => el.remove());
  root.querySelectorAll("*").forEach((el) => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();
      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
        continue;
      }
      if ((name === "href" || name === "src" || name === "xlink:href") && /^(javascript|vbscript|data:text)/i.test(value)) {
        el.removeAttribute(attr.name);
      }
    }
  });
  return root.innerHTML;
}

/** Add-on CSS can restyle the desk. It cannot pull a remote sheet or image. */
export function sanitizePluginCss(css: string): string {
  return css
    .replace(/@import[\s\S]*?;/gi, "")
    .replace(/@import\s+(?:url\()?['"]?[^'")]+['"]?\)?/gi, "")
    .replace(/url\(\s*(['"]?)(?:https?:|\/\/)[^)]*\)/gi, "url($1about:blank)");
}
