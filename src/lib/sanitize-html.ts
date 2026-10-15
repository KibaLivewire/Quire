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

function isOnlyDataImage(value: string) {
  const next = value.trim();
  if (!/^data:image\/(?:png|jpe?g|gif|webp)(?:[;,].*)?$/i.test(next)) return false;
  if (/https?:\/\//i.test(next)) return false;
  if (/\s\/\//.test(next)) return false;
  return true;
}

/** A remote address outside a data-image payload. Slashes inside the payload are not a host. */
function hasRemoteAddress(value: string) {
  const rest = value.replace(/['"][^'"]*['"]/g, " ");
  if (/https?:\/\//i.test(rest)) return true;
  const withoutData = rest.replace(/data:image\/(?:png|jpe?g|gif|webp)(?:[;,][^\s"']*)?/gi, " ");
  return /(?:https?:|\/\/)/i.test(withoutData);
}

/** src() or url() stays only when the whole address is one data image. */
function cssAddressIsDataImage(inner: string) {
  const decoded = decodeCssEscapes(String(inner).trim(), false);
  if (hasRemoteAddress(decoded)) return false;
  const quoted = quotedCssStrings(decoded);
  if (quoted.length) return quoted.every((item) => !item || isOnlyDataImage(decodeCssEscapes(item, false)));
  const raw = decoded.replace(/^['"]|['"]$/g, "").trim();
  return isOnlyDataImage(raw);
}

/** A string inside image() or image-set() is a picture address. A remote one is not a filter. Nested calls count. */
function remoteImageCall(value: string) {
  return imageCalls(value).some((call) => imageCallIsRemote(call.inner));
}

function imageCalls(value: string): { start: number; end: number; inner: string }[] {
  const calls: { start: number; end: number; inner: string }[] = [];
  let i = 0;
  let quote = "";
  while (i < value.length) {
    const ch = value[i] ?? "";
    const next = value[i + 1] ?? "";
    if (quote) {
      if (ch === "\\" && next) {
        i += 2;
        continue;
      }
      if (ch === quote) quote = "";
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      i += 1;
      continue;
    }
    const paren = imageNameParen(value, i);
    if (!paren) {
      i += 1;
      continue;
    }
    const end = matchingParen(value, paren);
    if (end < 0) {
      i += 1;
      continue;
    }
    calls.push({ start: i, end, inner: value.slice(paren + 1, end) });
    i = end + 1;
  }
  return calls;
}

function imageNameParen(value: string, i: number): number {
  if (i > 0 && /[A-Za-z0-9_-]/.test(value[i - 1] ?? "")) return 0;
  const names = ["-webkit-image-set", "-webkit-cross-fade", "image-set", "cross-fade", "image"];
  for (const name of names) {
    if (!value.startsWith(name, i)) continue;
    const after = i + name.length;
    if (/[A-Za-z0-9_-]/.test(value[after] ?? "")) continue;
    let j = after;
    while (value[j] === " " || value[j] === "\t" || value[j] === "\n" || value[j] === "\r" || value[j] === "\f") j += 1;
    if (value[j] === "(") return j;
  }
  return 0;
}

function matchingParen(value: string, open: number): number {
  let depth = 0;
  let quote = "";
  for (let i = open; i < value.length; i += 1) {
    const ch = value[i] ?? "";
    const next = value[i + 1] ?? "";
    if (quote) {
      if (ch === "\\" && next) {
        i += 1;
        continue;
      }
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** type() names a format. It is not a picture address. */
function stripTypeCalls(value: string) {
  return value.replace(/\btype\s*\(\s*(['"])[^'"]*\1\s*\)/gi, " ");
}

function imageCallIsRemote(inner: string) {
  const body = stripTypeCalls(inner);
  if (hasRemoteAddress(body)) return true;
  const quoted = quotedCssStrings(body);
  if (quoted.some((item) => item && !isOnlyDataImage(item))) return true;
  if (/\bvar\s*\(/i.test(body)) return true;
  return false;
}

/** src() is another way to name a picture. A data image stays. A remote one does not. */
function hasRemoteSrc(value: string) {
  for (const call of value.matchAll(/\bsrc\s*\(\s*([^)]*)\)/gi)) {
    if (!cssAddressIsDataImage(call[1] ?? "")) return true;
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

/** A legacy picture attribute, or a click that would also call a second address.
 *  Undefined means this attribute is not one of those. A data image on background stays. ping never does.
 */
export function presentationalUrl(name: string, value: string): string | null | undefined {
  const key = name.toLowerCase();
  if (key === "ping") return null;
  if (key === "background") {
    const src = value.trim();
    return isSafeSrc(src) ? src : null;
  }
  return undefined;
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
      const fetched = presentationalUrl(name, value);
      if (fetched !== undefined) {
        if (fetched) el.setAttribute(attr.name, fetched);
        else el.removeAttribute(attr.name);
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

const VIEWPORT = /(?:^|[\s,(])-?\d*\.?\d+(?:[dls])?v(?:min|max|h|w|i|b)\b/i;

/** Semicolons inside a quote or a function stay with that declaration. A data image uses one. */
function splitCssDeclarations(value: string): string[] {
  const parts: string[] = [];
  let current = "";
  let quote = "";
  let depth = 0;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i] ?? "";
    const next = value[i + 1] ?? "";
    if (quote) {
      current += ch;
      if (ch === "\\" && next) {
        current += next;
        i += 1;
        continue;
      }
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === "(") {
      depth += 1;
      current += ch;
      continue;
    }
    if (ch === ")" && depth > 0) {
      depth -= 1;
      current += ch;
      continue;
    }
    if (ch === ";" && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current) parts.push(current);
  return parts;
}

/** Page styles keep colour, type, a relative picture offset, a filter, and a turn. They cannot cover the desk. */
export function sanitizeInlineStyle(value: string): string {
  const cleaned = sanitizePluginCss(`x{${value}}`).replace(/^x\{/, "").replace(/\}$/, "");
  const kept: string[] = [];
  for (const part of splitCssDeclarations(cleaned)) {
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
    const kind = /^src/i.test(all) ? "src" : "url";
    if (cssAddressIsDataImage(inner)) return `${kind}(${inner})`;
    return "url(about:blank)";
  });
  out = out.replace(/(?:html|body|:root)[^{]*\{[^}]*\}/gi, (block) =>
    block.replace(/display\s*:\s*none\s*;?/gi, "").replace(/pointer-events\s*:\s*none\s*;?/gi, ""),
  );
  return out;
}

function scrubRemoteImageCalls(css: string) {
  const calls = imageCalls(css);
  if (!calls.length) return css;
  let out = "";
  let cursor = 0;
  for (const call of calls) {
    out += css.slice(cursor, call.start);
    out += imageCallIsRemote(call.inner) ? "none" : css.slice(call.start, call.end + 1);
    cursor = call.end + 1;
  }
  return out + css.slice(cursor);
}

/** Add-on CSS can restyle the desk. It cannot pull a remote sheet or image. */
export function sanitizePluginCss(css: string): string {
  const readable = decodeCssEscapes(stripCssComments(css), false);
  return scrubRemoteImageCalls(scrubPluginCss(readable));
}
