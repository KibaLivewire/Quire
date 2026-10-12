import { isStoredLink } from "./open-url.ts";

function isSafeLink(value: string): boolean {
  return isStoredLink(value);
}

function isSafeSrc(value: string): boolean {
  const src = value.trim();
  if (!src || /[\u0000-\u001f]/.test(src)) return false;
  if (/^data:/i.test(src)) return /^data:image\/(?:png|jpe?g|gif|webp)(?:[;,])/i.test(src);
  if (/^(javascript|vbscript):/i.test(src)) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(src)) return false;
  if (src.startsWith("//") || src.startsWith("\\\\")) return false;
  return true;
}

function stripCssComments(value: string) {
  let out = "";
  let i = 0;
  let quote = "";
  while (i < value.length) {
    const ch = value[i] ?? "";
    const next = value[i + 1] ?? "";
    if (quote) {
      out += ch;
      if (ch === "\\" && next) {
        out += next;
        i += 2;
        continue;
      }
      if (ch === quote) quote = "";
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = value.indexOf("*/", i + 2);
      i = end < 0 ? value.length : end + 2;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/** Decoded form used only to recognise a dangerous declaration. The saved text stays as written. */
export function cssForCheck(value: string) {
  return decodeCssEscapes(stripCssComments(value), true);
}

function quotedCssStrings(value: string): string[] {
  return [...value.matchAll(/['"]([^'"]*)['"]/g)].map((item) => item[1]?.trim() ?? "");
}

function isDataImage(value: string) {
  return /^data:image\/(?:png|jpe?g|gif|webp)/i.test(value);
}

/** A string inside image() or image-set() is a picture address. A remote one is not a filter. */
function remoteImageCall(value: string) {
  for (const call of value.matchAll(/\b(?:-webkit-image-set|image-set|image)\s*\(([^()]*)\)/gi)) {
    const inner = call[1] ?? "";
    const quoted = quotedCssStrings(inner);
    if (quoted.some((item) => item && !isDataImage(item))) return true;
    if (!quoted.length && /(?:https?:|\/\/)/i.test(inner)) return true;
  }
  return false;
}

/** src() is another way to name a picture. A data image stays. A remote one does not. */
function hasRemoteSrc(value: string) {
  for (const call of value.matchAll(/\bsrc\s*\(\s*([^)]*)\)/gi)) {
    const raw = String(call[1] ?? "").trim().replace(/^['"]|['"]$/g, "");
    if (!isDataImage(decodeCssEscapes(raw, false))) return true;
  }
  return false;
}

function cssDangerous(value: string) {
  const checked = cssForCheck(value);
  return /url\s*\(|expression|javascript|@import/i.test(checked) || remoteImageCall(checked) || hasRemoteSrc(checked);
}

/** Picture edits stay a filter or a turn. An escaped url() is not a filter. */
export function sanitizeEditStyle(value: string): string {
  return value
    .split(";")
    .map((part) => part.trim())
    .filter((part) => {
      const checked = cssForCheck(part);
      return /^(?:filter|transform)\s*:/i.test(checked) && !cssDangerous(part);
    })
    .join("; ");
}

function cssCodePoint(code: number): string {
  if (!Number.isInteger(code) || code <= 0 || code > 0x10ffff) return "";
  if (code >= 0xd800 && code <= 0xdfff) return "";
  return String.fromCodePoint(code);
}

function decodeCssEscapes(value: string, tight: boolean) {
  const decoded = value
    .replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex: string) => cssCodePoint(Number.parseInt(hex, 16)))
    .replace(/\\(.)/g, "$1");
  return tight ? decoded.replace(/\s+/g, "") : decoded;
}

const URL_ATTRS = new Set(["href", "xlink:href", "src", "action", "formaction", "poster", "cite", "data-href", "data-src"]);

/** Drop scripts and event handlers. Formatting, pictures, and Quire marks stay. */
export function sanitizeHtml(html: string): string {
  if (!html || typeof document === "undefined") return html;
  const parsed = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = parsed.body.firstElementChild as HTMLElement | null;
  if (!root) return "";
  root.querySelectorAll("script, iframe, object, embed, link, meta, base, style, form, svg, math, template, noscript").forEach((el) => el.remove());
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
        if (cssDangerous(value)) el.removeAttribute(attr.name);
        else if (name === "data-color" && !/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) el.removeAttribute(attr.name);
        else if (name === "data-edit-style") {
          const props = sanitizeEditStyle(value);
          if (props) el.setAttribute(attr.name, props);
          else el.removeAttribute(attr.name);
        }
        continue;
      }
      if (name === "style") {
        const cleaned = sanitizeInlineStyle(value);
        if (cleaned.trim()) el.setAttribute(attr.name, cleaned);
        else el.removeAttribute(attr.name);
      }
    }
  });
  return root.innerHTML;
}

const VIEWPORT = /(?:^|[\s,(])-?\d*\.?\d+(?:vw|vh|vmin|vmax|vb|vi)\b/i;

/** Page styles keep colour, type, a relative picture offset, a filter, and a turn. They cannot cover the desk. */
export function sanitizeInlineStyle(value: string): string {
  const cleaned = sanitizePluginCss(`x{${value}}`).replace(/^x\{/, "").replace(/\}$/, "");
  const kept: string[] = [];
  for (const part of cleaned.split(";")) {
    const piece = part.trim();
    if (!piece) continue;
    const idx = piece.indexOf(":");
    if (idx <= 0) continue;
    const propRaw = piece.slice(0, idx).trim();
    const valRaw = piece.slice(idx + 1).trim();
    const prop = cssForCheck(propRaw).toLowerCase().replace(/\s+/g, "");
    const val = cssForCheck(valRaw).toLowerCase().replace(/!important/g, "").trim();
    const valTight = val.replace(/\s+/g, "");
    if (!prop || !val) continue;
    if (cssDangerous(`${propRaw}:${valRaw}`)) continue;
    if (prop === "position" && valTight !== "static" && valTight !== "relative") continue;
    if (VIEWPORT.test(val)) continue;
    kept.push(`${propRaw}:${valRaw}`);
  }
  return kept.join("; ");
}

function scrubPluginCss(css: string): string {
  let out = css
    .replace(/@import[\s\S]*?;/gi, "")
    .replace(/@import\s+(?:url\()?['"]?[^'")]+['"]?\)?/gi, "")
    .replace(/expression\s*\(/gi, "invalid(")
    .replace(/behaviour\s*:/gi, "invalid:")
    .replace(/behavior\s*:/gi, "invalid:")
    .replace(/-moz-binding/gi, "invalid");
  out = out.replace(/(?:url|src)\s*\(\s*([^)]*)\)/gi, (all, inner: string) => {
    const raw = String(inner).trim().replace(/^['"]|['"]$/g, "");
    const decoded = decodeCssEscapes(raw, false);
    const kind = /^src/i.test(all) ? "src" : "url";
    if (/^data:image\/(?:png|jpe?g|gif|webp)/i.test(decoded)) return `${kind}(${inner})`;
    return "url(about:blank)";
  });
  out = out.replace(/(?:html|body|:root)[^{]*\{[^}]*\}/gi, (block) =>
    block.replace(/display\s*:\s*none\s*;?/gi, "").replace(/pointer-events\s*:\s*none\s*;?/gi, ""),
  );
  return out;
}

function scrubRemoteImageCalls(css: string) {
  return css.replace(/\b(?:-webkit-image-set|image-set|image)\s*\(([^()]*)\)/gi, (all, inner: string) => {
    const body = String(inner);
    const quoted = quotedCssStrings(body);
    if (quoted.length) {
      if (quoted.every((item) => !item || isDataImage(item))) return all;
      return "none";
    }
    if (/(?:https?:|\/\/)/i.test(body)) return "none";
    return all;
  });
}

/** Add-on CSS can restyle the desk. It cannot pull a remote sheet or image. */
export function sanitizePluginCss(css: string): string {
  const readable = decodeCssEscapes(stripCssComments(css), false);
  return scrubRemoteImageCalls(scrubPluginCss(readable));
}
