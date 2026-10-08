function isSafeLink(value: string): boolean {
  const href = value.trim();
  if (!href) return false;
  if (href.startsWith("#") && !href.startsWith("#//") && !/^#javascript:/i.test(href)) return true;
  return /^(https?:|mailto:)/i.test(href);
}

function isSafeSrc(value: string): boolean {
  const src = value.trim();
  if (!src) return false;
  if (/^(javascript|vbscript):/i.test(src)) return false;
  if (/^data:/i.test(src)) return /^data:image\/(?:png|jpe?g|gif|webp)/i.test(src);
  if (/^(https?:|\/\/)/i.test(src)) return false;
  return true;
}

function decodeCssEscapes(value: string) {
  return value
    .replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
    })
    .replace(/\\(.)/g, "$1")
    .replace(/\s+/g, "");
}

const URL_ATTRS = new Set(["href", "xlink:href", "src", "action", "formaction", "poster", "cite", "data-href", "data-src"]);

/** Drop scripts and event handlers. Formatting, pictures, and Quire marks stay. */
export function sanitizeHtml(html: string): string {
  if (!html || typeof document === "undefined") return html;
  const parsed = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = parsed.body.firstElementChild as HTMLElement | null;
  if (!root) return "";
  root.querySelectorAll("script, iframe, object, embed, link, meta, base, style, form, svg, math").forEach((el) => el.remove());
  root.querySelectorAll("*").forEach((el) => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();
      if (name.startsWith("on") || name === "srcdoc" || name.startsWith("xmlns")) {
        el.removeAttribute(attr.name);
        continue;
      }
      if (name === "srcset") {
        const kept = value
          .split(",")
          .map((part) => part.trim())
          .filter((part) => isSafeSrc(part.split(/\s+/)[0] || ""));
        if (kept.length) el.setAttribute(attr.name, kept.join(", "));
        else el.removeAttribute(attr.name);
        continue;
      }
      if (URL_ATTRS.has(name)) {
        if (name === "src" || name === "poster" || name === "data-src") {
          if (!isSafeSrc(value)) el.removeAttribute(attr.name);
        } else if (!isSafeLink(value)) {
          el.removeAttribute(attr.name);
        }
        continue;
      }
      if (name === "data-edit-style" || name === "data-color") {
        if (/url\s*\(|expression|javascript|@import/i.test(value)) el.removeAttribute(attr.name);
        else if (name === "data-color" && !/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) el.removeAttribute(attr.name);
        continue;
      }
      if (name === "style") {
        const cleaned = sanitizePluginCss(`x{${value}}`).replace(/^x\{/, "").replace(/\}$/, "");
        if (cleaned.trim()) el.setAttribute(attr.name, cleaned);
        else el.removeAttribute(attr.name);
      }
    }
  });
  return root.innerHTML;
}

/** Add-on CSS can restyle the desk. It cannot pull a remote sheet or image. */
export function sanitizePluginCss(css: string): string {
  let out = css
    .replace(/@import[\s\S]*?;/gi, "")
    .replace(/@import\s+(?:url\()?['"]?[^'")]+['"]?\)?/gi, "")
    .replace(/expression\s*\(/gi, "invalid(")
    .replace(/behaviour\s*:/gi, "invalid:")
    .replace(/behavior\s*:/gi, "invalid:")
    .replace(/-moz-binding/gi, "invalid");
  out = out.replace(/url\s*\(\s*([^)]*)\)/gi, (_all, inner: string) => {
    const raw = String(inner).trim().replace(/^['"]|['"]$/g, "");
    const decoded = decodeCssEscapes(raw);
    if (/^data:image\/(?:png|jpe?g|gif|webp)/i.test(decoded)) return `url(${inner})`;
    return "url(about:blank)";
  });
  out = out.replace(/(?:html|body|:root)[^{]*\{[^}]*\}/gi, (block) =>
    block.replace(/display\s*:\s*none\s*;?/gi, "").replace(/pointer-events\s*:\s*none\s*;?/gi, ""),
  );
  return out;
}
