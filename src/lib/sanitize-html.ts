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
  // A string from the page is an address inside a picture function. The same as a variable.
  if (/\battr\s*\(/i.test(body)) return true;
  return false;
}

/** src() is another way to name a picture. A data image stays. A remote one does not. */
function hasRemoteSrc(value: string) {
  for (const call of value.matchAll(/\bsrc\s*\(\s*([^)]*)\)/gi)) {
    if (!cssAddressIsDataImage(call[1] ?? "")) return true;
  }
  return false;
}

function attrNameParen(value: string, i: number): number {
  if (i > 0 && /[A-Za-z0-9_-]/.test(value[i - 1] ?? "")) return 0;
  if (!value.slice(i, i + 4).toLowerCase().startsWith("attr")) return 0;
  const after = i + 4;
  if (/[A-Za-z0-9_-]/.test(value[after] ?? "")) return 0;
  let j = after;
  while (value[j] === " " || value[j] === "\t" || value[j] === "\n" || value[j] === "\r" || value[j] === "\f") j += 1;
  if (value[j] === "(") return j;
  return 0;
}

function attrCalls(value: string): { start: number; end: number; inner: string }[] {
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
    const paren = attrNameParen(value, i);
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

/** The type, before a fallback comma. Quotes and nested calls stay out of the type. */
function attrHead(inner: string): string {
  let out = "";
  let quote = "";
  let depth = 0;
  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i] ?? "";
    const next = inner[i + 1] ?? "";
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
    if (ch === "(") {
      depth += 1;
      continue;
    }
    if (ch === ")" && depth > 0) {
      depth -= 1;
      continue;
    }
    if (ch === "," && depth === 0) break;
    out += ch;
  }
  return out;
}

/** attr(name url) and attr(name type(<url|image>)) are pictures. attr(name) is still the text. */
function attrCallIsUrl(inner: string): boolean {
  const tokens = attrHead(inner)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length >= 2 && /^url$/i.test(tokens[1] ?? "")) return true;
  return attrTypeFetches(inner);
}

/** type(<url>) and type(<image>) are the newer way to say the same picture. A quoted fallback is not. */
function attrTypeFetches(inner: string): boolean {
  let quote = "";
  let text = "";
  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i] ?? "";
    const next = inner[i + 1] ?? "";
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
    text += ch;
  }
  return /<\s*url\b/i.test(text) || /<\s*image\b/i.test(text);
}

function hasAttrUrl(value: string): boolean {
  const spaced = decodeCssEscapes(stripCssComments(value), false);
  return attrCalls(spaced).some((call) => attrCallIsUrl(call.inner));
}

function scrubAttrUrls(css: string): string {
  const calls = attrCalls(css).filter((call) => attrCallIsUrl(call.inner));
  if (!calls.length) return css;
  let out = "";
  let cursor = 0;
  for (const call of calls) {
    out += css.slice(cursor, call.start);
    out += "none";
    cursor = call.end + 1;
  }
  return out + css.slice(cursor);
}

function cssDangerous(value: string) {
  const checked = cssForCheck(value);
  return /url\s*\(|expression|javascript|@import/i.test(checked) || remoteImageCall(checked) || hasRemoteSrc(checked) || hasAttrUrl(value);
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
  let out = "";
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i] ?? "";
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    const next = value[i + 1] ?? "";
    if (!next) break;
    if (next === "\n" || next === "\r" || next === "\f") {
      i += 1;
      if (next === "\r" && value[i + 1] === "\n") i += 1;
      continue;
    }
    if (/[0-9a-fA-F]/.test(next)) {
      let hex = "";
      let j = i + 1;
      while (j < value.length && hex.length < 6 && /[0-9a-fA-F]/.test(value[j] ?? "")) {
        hex += value[j];
        j += 1;
      }
      if (j < value.length && /[ \t\n\r\f]/.test(value[j] ?? "")) j += 1;
      out += cssCodePoint(Number.parseInt(hex, 16));
      i = j - 1;
      continue;
    }
    out += next;
    i += 1;
  }
  return tight ? out.replace(/\s+/g, "") : out;
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

const VIEWPORT =
  /(?:^|[\s,(])[+-]?(?:\d*\.?\d+)(?:[eE][+-]?\d+)?(?:[dls])?v(?:min|max|h|w|i|b)\b|(?:^|[\s,(])[+-]?(?:\d*\.?\d+)(?:[eE][+-]?\d+)?cq(?:min|max|h|w|i|b)\b/i;

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
  return out;
}

/** html, body, :root, a bare *, and :is(*) can still hide the desk. A class rule stays. */
function isZeroAmount(value: string): boolean {
  const v = value.replace(/!important/gi, "").replace(/\s+/g, "").toLowerCase();
  return /^[+-]?(?:0+(?:\.0*)?|\.0+)(?:e[+-]?\d+)?(?:%|[a-z]+)?$/.test(v);
}

/** calc(0), calc(0%), and calc(0 * 1) are still zero. Anything with a unit or a name is not. */
function calcEvaluatesZero(value: string): boolean {
  const compact = value.replace(/!important/gi, "").trim();
  const wrapped = /^calc\(([\s\S]*)\)$/i.exec(compact);
  if (!wrapped) return false;
  const inner = (wrapped[1] ?? "").trim();
  if (isZeroAmount(inner) || calcEvaluatesZero(inner)) return true;
  const s = inner.replace(/%/g, "").replace(/\s+/g, "");
  if (!s || !/^[\d+\-*/().]+$/.test(s)) return false;
  let i = 0;
  const parseExpr = (): number | null => {
    let left = parseTerm();
    if (left == null) return null;
    while (s[i] === "+" || s[i] === "-") {
      const op = s[i];
      i += 1;
      const right = parseTerm();
      if (right == null) return null;
      left = op === "+" ? left + right : left - right;
    }
    return left;
  };
  const parseTerm = (): number | null => {
    let left = parseFactor();
    if (left == null) return null;
    while (s[i] === "*" || s[i] === "/") {
      const op = s[i];
      i += 1;
      const right = parseFactor();
      if (right == null) return null;
      left = op === "*" ? left * right : right === 0 ? Number.NaN : left / right;
    }
    return left;
  };
  const parseFactor = (): number | null => {
    if (s[i] === "+") {
      i += 1;
      return parseFactor();
    }
    if (s[i] === "-") {
      i += 1;
      const n = parseFactor();
      return n == null ? null : -n;
    }
    if (s[i] === "(") {
      i += 1;
      const n = parseExpr();
      if (s[i] !== ")") return null;
      i += 1;
      return n;
    }
    const m = /^(\d*\.?\d+)/.exec(s.slice(i));
    if (!m?.[1] || m[1] === ".") return null;
    i += m[1].length;
    return Number(m[1]);
  };
  const n = parseExpr();
  return n != null && i === s.length && n === 0;
}

function hidesAsZero(value: string): boolean {
  return isZeroAmount(value) || calcEvaluatesZero(value) || mathEvaluatesZero(value);
}

function varNameParen(value: string, i: number): number {
  if (i > 0 && /[A-Za-z0-9_-]/.test(value[i - 1] ?? "")) return 0;
  if (value.slice(i, i + 3).toLowerCase() !== "var") return 0;
  const after = i + 3;
  if (/[A-Za-z0-9_-]/.test(value[after] ?? "")) return 0;
  let j = after;
  while (value[j] === " " || value[j] === "\t" || value[j] === "\n" || value[j] === "\r" || value[j] === "\f") j += 1;
  if (value[j] === "(") return j;
  return 0;
}

function splitTopComma(value: string): { head: string; tail: string } {
  let quote = "";
  let depth = 0;
  for (let i = 0; i < value.length; i += 1) {
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
    if (ch === "(") {
      depth += 1;
      continue;
    }
    if (ch === ")" && depth > 0) {
      depth -= 1;
      continue;
    }
    if (ch === "," && depth === 0) return { head: value.slice(0, i), tail: value.slice(i + 1) };
  }
  return { head: value, tail: "" };
}

function varCalls(value: string): { name: string; fallback: string }[] {
  const calls: { name: string; fallback: string }[] = [];
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
    const paren = varNameParen(value, i);
    if (!paren) {
      i += 1;
      continue;
    }
    const end = matchingParen(value, paren);
    if (end < 0) {
      i += 1;
      continue;
    }
    const parts = splitTopComma(value.slice(paren + 1, end));
    const name = parts.head.trim();
    if (name.startsWith("--")) calls.push({ name, fallback: parts.tail.trim() });
    i = end + 1;
  }
  return calls;
}

function valueCanHide(value: string, hidden: Set<string>, pred: (v: string) => boolean): boolean {
  if (pred(value)) return true;
  for (const call of varCalls(value)) {
    if (hidden.has(call.name)) return true;
    if (call.fallback && valueCanHide(call.fallback, hidden, pred)) return true;
  }
  return false;
}

function functionCallsNamed(value: string, names: string[]): string[] {
  const wanted = [...names].sort((a, b) => b.length - a.length);
  const found: string[] = [];
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
    let matched = "";
    if (i === 0 || !/[A-Za-z0-9_-]/.test(value[i - 1] ?? "")) {
      for (const name of wanted) {
        if (!value.slice(i, i + name.length).toLowerCase().startsWith(name)) continue;
        const after = i + name.length;
        if (/[A-Za-z0-9_-]/.test(value[after] ?? "")) continue;
        matched = name;
        break;
      }
    }
    if (!matched) {
      i += 1;
      continue;
    }
    let j = i + matched.length;
    while (value[j] === " " || value[j] === "\t" || value[j] === "\n" || value[j] === "\r" || value[j] === "\f") j += 1;
    if (value[j] !== "(") {
      i += 1;
      continue;
    }
    const end = matchingParen(value, j);
    if (end < 0) {
      i += 1;
      continue;
    }
    found.push(value.slice(j + 1, end));
    i = end + 1;
  }
  return found;
}

function splitScaleParts(value: string): string[] {
  const parts: string[] = [];
  let current = "";
  let quote = "";
  let depth = 0;
  const flush = () => {
    if (current.trim()) parts.push(current.trim());
    current = "";
  };
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
    if (depth === 0 && (ch === "," || /\s/.test(ch))) {
      flush();
      continue;
    }
    current += ch;
  }
  flush();
  return parts;
}

function splitArgs(value: string): string[] {
  const args: string[] = [];
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
    if (ch === "," && depth === 0) {
      args.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) args.push(current);
  return args;
}

function percentSum(value: string): number | null {
  const token = value.replace(/!important/gi, "").trim();
  const m = /^([+-]?(?:\d*\.?\d+)(?:e[+-]?\d+)?)%$/i.exec(token);
  if (!m?.[1] || m[1] === "." || m[1] === "+" || m[1] === "-") return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/** inset() or a zero circle covers the element. A class can still clip. A partial inset stays. */
function clipHides(value: string, hidden: Set<string>): boolean {
  const found = namedFunctionCalls(value, ["ellipse", "circle", "inset"]);
  return found.some((call) => {
    if (call.name === "circle") {
      const radius = (call.inner.trim().match(/^[^\s]+/)?.[0] ?? "").trim();
      return Boolean(radius) && valueCanHide(radius, hidden, hidesAsZero);
    }
    if (call.name === "ellipse") {
      const parts = call.inner.trim().split(/\s+/);
      return parts.slice(0, 2).some((part) => valueCanHide(part, hidden, hidesAsZero));
    }
    const raw = splitArgs(call.inner).map((part) => part.trim()).filter(Boolean);
    const sides = raw.length <= 1 ? [raw[0] ?? "", raw[0] ?? "", raw[0] ?? "", raw[0] ?? ""] : raw.length === 2 ? [raw[0] ?? "", raw[1] ?? "", raw[0] ?? "", raw[1] ?? ""] : raw.length === 3 ? [raw[0] ?? "", raw[1] ?? "", raw[2] ?? "", raw[1] ?? ""] : [raw[0] ?? "", raw[1] ?? "", raw[2] ?? "", raw[3] ?? ""];
    const pct = sides.map((side) => percentSum(side));
    const top = pct[0];
    const right = pct[1];
    const bottom = pct[2];
    const left = pct[3];
    if (top == null || right == null || bottom == null || left == null) return false;
    return top + bottom >= 100 || left + right >= 100;
  });
}

function declarationHidesDesk(piece: string, hidden: Set<string>): boolean {
  const idx = piece.indexOf(":");
  if (idx <= 0) return false;
  const prop = piece.slice(0, idx).trim().toLowerCase().replace(/\s+/g, "");
  const val = piece.slice(idx + 1).trim();
  if (!prop || !val) return false;
  if (prop === "display" || prop === "pointer-events") return valueCanHide(val, hidden, (v) => /\bnone\b/i.test(v));
  if (prop === "visibility") return valueCanHide(val, hidden, (v) => /\b(?:hidden|collapse)\b/i.test(v));
  if (prop === "content-visibility") return valueCanHide(val, hidden, (v) => /\bhidden\b/i.test(v));
  if (prop === "opacity") return valueCanHide(val, hidden, hidesAsZero);
  if (prop === "filter" || prop === "-webkit-filter") {
    return functionCallsNamed(val, ["opacity", "brightness", "contrast"]).some((inner) => valueCanHide(inner, hidden, hidesAsZero));
  }
  if (prop === "scale") {
    return splitScaleParts(val.replace(/!important/gi, "")).some((arg) => valueCanHide(arg, hidden, hidesAsZero));
  }
  if (prop === "transform" || prop === "-webkit-transform") {
    if (
      functionCallsNamed(val, ["scale3d", "scalex", "scaley", "scalez", "scale"]).some((inner) =>
        splitArgs(inner).some((arg) => valueCanHide(arg, hidden, hidesAsZero)),
      )
    ) {
      return true;
    }
    return matrixFlattens(val, hidden);
  }
  if (prop === "zoom") return valueCanHide(val, hidden, hidesAsZero);
  if (prop === "clip-path" || prop === "-webkit-clip-path") return clipHides(val, hidden);
  return false;
}

function collectHideVars(css: string): Set<string> {
  const raw = new Map<string, string>();
  const prop = /@property\s+(--[A-Za-z_][\w-]*)\s*\{/gi;
  for (const hit of css.matchAll(prop)) {
    const name = hit[1] ?? "";
    const open = (hit.index ?? 0) + hit[0].length - 1;
    const close = matchingBrace(css, open);
    if (!name || close < 0) continue;
    const init = /initial-value\s*:\s*([^;}{]+)/i.exec(css.slice(open + 1, close));
    if (init?.[1]) raw.set(name, init[1].trim());
  }
  for (const hit of css.matchAll(/--([A-Za-z_][\w-]*)\s*:\s*([^;}{]+)/g)) {
    raw.set(`--${hit[1]}`, (hit[2] ?? "").trim());
  }
  const hidden = new Set<string>();
  const hides = (value: string) =>
    valueCanHide(value, hidden, (v) => {
      const token = v.replace(/!important/gi, "").replace(/\s+/g, "").toLowerCase();
      return token === "none" || token === "hidden" || token === "collapse" || hidesAsZero(v);
    });
  let changed = true;
  while (changed) {
    changed = false;
    for (const [name, value] of raw) {
      if (hidden.has(name)) continue;
      if (hides(value)) {
        hidden.add(name);
        changed = true;
      }
    }
  }
  return hidden;
}

function scrubHideBody(body: string, hidden: Set<string>, anims: Set<string> = new Set()) {
  return splitCssDeclarations(body)
    .map((part) => part.trim())
    .filter((part) => part && !declarationHidesDesk(part, hidden) && !declarationUsesHidingAnim(part, anims))
    .join("; ");
}

function hasUniversalArgument(inner: string): boolean {
  return /(?:^|[\s,])\*(?![A-Za-z0-9_-])/.test(inner);
}

/** A star next to a star, including a star in any namespace, still matches every element. A star in front of a class does not. */
function isStarPairSelector(selector: string) {
  const uni = String.raw`(?:\*(?:\|\*)?|(?::is|:where|:matches|:-webkit-any)\(\s*\*(?:\|\*)?\s*\))`;
  const bit = new RegExp(`^(?:${uni})(?:\\s*(?:[+>~]\\s*)?(?:${uni}))+$`, "i");
  const parts = selector
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 && parts.every((part) => bit.test(part.replace(/\s+/g, " ")));
}

type MathQty = { n: number; u: Record<string, number>; i: number };

function blankUnits(): Record<string, number> {
  return {};
}

function unitsEqual(a: Record<string, number>, b: Record<string, number>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a[key] || 0) !== (b[key] || 0)) return false;
  }
  return true;
}

function combineUnits(a: Record<string, number>, b: Record<string, number>, sign: 1 | -1): Record<string, number> {
  const out: Record<string, number> = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const exp = (a[key] || 0) + sign * (b[key] || 0);
    if (exp) out[key] = exp;
  }
  return out;
}

/** min, max, clamp, abs, and any other math call that is exactly zero. A plain 0.5 stays. */
function mathEvaluatesZero(value: string): boolean {
  const s = value.replace(/!important/gi, "").replace(/\s+/g, "");
  if (!s || !/^[a-z-]+\(/i.test(s)) return false;
  const parsed = parseMathSum(s, 0);
  return Boolean(parsed && parsed.i === s.length && parsed.n === 0 && Number.isFinite(parsed.n));
}

function parseMathSum(s: string, i: number): MathQty | null {
  let left = parseMathMul(s, i);
  if (!left) return null;
  while (s[left.i] === "+" || s[left.i] === "-") {
    const minus = s[left.i] === "-";
    const right = parseMathMul(s, left.i + 1);
    if (!right) return null;
    if (left.n === 0 && right.n === 0) {
      left = { n: 0, u: blankUnits(), i: right.i };
      continue;
    }
    if (left.n === 0) {
      left = { n: minus ? -right.n : right.n, u: right.u, i: right.i };
      continue;
    }
    if (right.n === 0) {
      left = { n: left.n, u: left.u, i: right.i };
      continue;
    }
    if (!unitsEqual(left.u, right.u)) return null;
    left = { n: minus ? left.n - right.n : left.n + right.n, u: left.u, i: right.i };
  }
  return left;
}

function parseMathMul(s: string, i: number): MathQty | null {
  let left = parseMathUnary(s, i);
  if (!left) return null;
  while (s[left.i] === "*" || s[left.i] === "/") {
    const divide = s[left.i] === "/";
    const right = parseMathUnary(s, left.i + 1);
    if (!right) return null;
    if (divide && right.n === 0) return null;
    left = {
      n: divide ? left.n / right.n : left.n * right.n,
      u: combineUnits(left.u, right.u, divide ? -1 : 1),
      i: right.i,
    };
  }
  return left;
}

function parseMathUnary(s: string, i: number): MathQty | null {
  if (s[i] === "+") return parseMathUnary(s, i + 1);
  if (s[i] === "-") {
    const next = parseMathUnary(s, i + 1);
    if (!next) return null;
    return { n: -next.n, u: next.u, i: next.i };
  }
  if (s[i] === "(") {
    const inner = parseMathSum(s, i + 1);
    if (!inner || s[inner.i] !== ")") return null;
    return { n: inner.n, u: inner.u, i: inner.i + 1 };
  }
  const call = parseMathCall(s, i);
  if (call) return call;
  if (/^infinity(?![a-z0-9_])/i.test(s.slice(i))) return { n: Infinity, u: blankUnits(), i: i + "infinity".length };
  if (/^e(?![a-z0-9_])/i.test(s.slice(i))) return { n: Math.E, u: blankUnits(), i: i + 1 };
  if (/^pi(?![a-z0-9_])/i.test(s.slice(i))) return { n: 1, u: { pi: 1 }, i: i + 2 };
  const m = /^(\d*\.?\d+)(?:e([+-]?\d+))?([a-z%]*)/i.exec(s.slice(i));
  if (!m?.[1] || m[1] === ".") return null;
  const n = Number(m[1]) * (m[2] ? 10 ** Number(m[2]) : 1);
  if (!Number.isFinite(n)) return null;
  const unit = (m[3] || "").toLowerCase();
  if (unit && !/^(?:px|em|rem|pt|pc|in|cm|mm|vh|vw|vmin|vmax|dvh|svh|lvh|dvw|svw|lvw|deg|turn|rad|grad|s|ms|fr|ch|ex|%)$/.test(unit)) return null;
  const u = unit ? { [unit]: 1 } : blankUnits();
  return { n, u, i: i + m[0].length };
}

function cssRound(strategy: string, a: number, b: number): number {
  if (b === 0 || !Number.isFinite(a) || !Number.isFinite(b)) return Number.NaN;
  const q = a / b;
  if (strategy === "to-zero") return b * Math.trunc(q);
  const base = Math.floor(q);
  const frac = q - base;
  if (strategy === "down") return b * base;
  if (strategy === "up") return b * (frac === 0 ? base : base + 1);
  if (frac === 0) return b * base;
  if (frac > 0.5 || Math.abs(frac - 0.5) < 1e-12) return b * (base + 1);
  return b * base;
}

function cssMod(a: number, b: number): number {
  if (b === 0 || !Number.isFinite(a) || !Number.isFinite(b)) return Number.NaN;
  return a - b * Math.floor(a / b);
}

function cssRem(a: number, b: number): number {
  if (b === 0 || !Number.isFinite(a) || !Number.isFinite(b)) return Number.NaN;
  return a - b * Math.trunc(a / b);
}

function nearInt(q: number): boolean {
  return Number.isFinite(q) && Math.abs(q) < 1e12 && Math.abs(q - Math.round(q)) < 1e-9;
}

/** Exact sine and cosine. An angle that is not an exact zero stays, including sin(90deg). */
function angleSinCos(arg: MathQty): { sin: number; cos: number } | null {
  const keys = Object.keys(arg.u);
  if (keys.length > 1) return null;
  const unit = keys[0] || "";
  const n = arg.n;
  if (!Number.isFinite(n)) return null;
  if (!unit || unit === "rad") return n === 0 ? { sin: 0, cos: 1 } : null;
  if (unit === "pi") {
    if (nearInt(n)) {
      const k = Math.round(n);
      return { sin: 0, cos: k % 2 === 0 ? 1 : -1 };
    }
    if (nearInt(n * 2)) {
      const half = Math.round(n * 2);
      const positive = ((half % 4) + 4) % 4;
      return { sin: positive === 1 ? 1 : -1, cos: 0 };
    }
    return null;
  }
  if (unit === "deg" || unit === "turn" || unit === "grad") {
    const deg = unit === "deg" ? n : unit === "turn" ? n * 360 : n * 0.9;
    if (nearInt(deg / 180)) {
      const k = Math.round(deg / 180);
      return { sin: 0, cos: k % 2 === 0 ? 1 : -1 };
    }
    if (nearInt((deg - 90) / 180)) {
      const k = Math.round((deg - 90) / 180);
      return { sin: k % 2 === 0 ? 1 : -1, cos: 0 };
    }
    return null;
  }
  return null;
}

function inverseAngle(name: string, args: MathQty[]): number | null {
  if (!args.length || args.some((arg) => Object.keys(arg.u).length || !Number.isFinite(arg.n))) return null;
  if (name === "asin" && args.length === 1) {
    const x = args[0]?.n ?? Number.NaN;
    if (x === 0) return 0;
    if (x === 1) return Math.PI / 2;
    if (x === -1) return -Math.PI / 2;
    return null;
  }
  if (name === "acos" && args.length === 1) {
    const x = args[0]?.n ?? Number.NaN;
    if (x === 1) return 0;
    if (x === 0) return Math.PI / 2;
    if (x === -1) return Math.PI;
    return null;
  }
  if (name === "atan" && args.length === 1) return args[0]?.n === 0 ? 0 : null;
  if (name === "atan2" && args.length === 2) {
    const y = args[0]?.n ?? Number.NaN;
    const x = args[1]?.n ?? Number.NaN;
    if (y === 0 && x > 0) return 0;
    if (y === 0 && x < 0) return Math.PI;
    if (x === 0 && y > 0) return Math.PI / 2;
    if (x === 0 && y < 0) return -Math.PI / 2;
    return null;
  }
  return null;
}

function parseMathCall(s: string, i: number): MathQty | null {
  const names = ["clamp", "hypot", "round", "atan2", "sqrt", "sign", "calc", "asin", "acos", "atan", "min", "max", "mod", "pow", "log", "abs", "rem", "sin", "cos", "tan", "exp"];
  for (const name of names) {
    if (s.slice(i, i + name.length).toLowerCase() !== name) continue;
    if (s[i + name.length] !== "(") continue;
    let strategy = "";
    let cursor = i + name.length + 1;
    if (name === "round") {
      const strat = /^(nearest|to-zero|down|up)(?![a-z0-9_-])/i.exec(s.slice(cursor));
      if (strat) {
        strategy = (strat[1] ?? "").toLowerCase();
        cursor += strat[0].length;
        if (s[cursor] !== ",") return null;
        cursor += 1;
      }
    }
    const args: MathQty[] = [];
    if (s[cursor] === ")") return { n: Number.NaN, u: blankUnits(), i: cursor + 1 };
    while (cursor < s.length) {
      const arg = parseMathSum(s, cursor);
      if (!arg) return null;
      args.push(arg);
      cursor = arg.i;
      if (s[cursor] === ",") {
        cursor += 1;
        continue;
      }
      if (s[cursor] === ")") {
        cursor += 1;
        break;
      }
      return null;
    }
    if (!args.length) return null;
    if (args.some((arg) => !Number.isFinite(arg.n)) && !/^(?:min|max|clamp|exp|abs|pow|hypot|calc)$/.test(name)) return null;
    const unit = args.find((arg) => arg.n !== 0)?.u ?? blankUnits();
    if (name !== "sign" && name !== "sin" && name !== "cos" && name !== "tan" && name !== "log" && name !== "pow" && name !== "sqrt" && name !== "round" && name !== "mod" && name !== "rem" && name !== "hypot") {
      if (args.some((arg) => arg.n !== 0 && !unitsEqual(arg.u, unit))) return null;
    }
    let n = args[0]?.n ?? Number.NaN;
    if (name === "min") n = Math.min(...args.map((arg) => arg.n));
    else if (name === "max") n = Math.max(...args.map((arg) => arg.n));
    else if (name === "abs") {
      if (args.length !== 1) return null;
      n = Math.abs(args[0]?.n ?? Number.NaN);
    } else if (name === "clamp") {
      if (args.length !== 3) return null;
      const lo = args[0]?.n ?? Number.NaN;
      const mid = args[1]?.n ?? Number.NaN;
      const hi = args[2]?.n ?? Number.NaN;
      if (lo > hi) return null;
      n = Math.min(Math.max(mid, lo), hi);
    } else if (name === "sign") {
      if (args.length !== 1) return null;
      n = Math.sign(args[0]?.n ?? Number.NaN);
      return { n, u: blankUnits(), i: cursor };
    } else if (name === "sqrt") {
      if (args.length !== 1 || Object.keys(args[0]?.u ?? {}).length) return null;
      if ((args[0]?.n ?? 0) < 0) return { n: Number.NaN, u: blankUnits(), i: cursor };
      n = Math.sqrt(args[0]?.n ?? Number.NaN);
      return { n, u: blankUnits(), i: cursor };
    } else if (name === "log") {
      if ((args.length !== 1 && args.length !== 2) || args.some((arg) => Object.keys(arg.u).length)) return null;
      const a = args[0]?.n ?? Number.NaN;
      const b = args.length === 2 ? (args[1]?.n ?? Number.NaN) : Math.E;
      if (a <= 0 || b <= 0 || b === 1) return { n: Number.NaN, u: blankUnits(), i: cursor };
      n = Math.log(a) / Math.log(b);
      return { n, u: blankUnits(), i: cursor };
    } else if (name === "pow") {
      if (args.length !== 2 || args.some((arg) => Object.keys(arg.u).length)) return null;
      const base = args[0]?.n ?? Number.NaN;
      const exp = args[1]?.n ?? Number.NaN;
      if (base < 0 && !Number.isInteger(exp)) return { n: Number.NaN, u: blankUnits(), i: cursor };
      n = Math.pow(base, exp);
      return { n, u: blankUnits(), i: cursor };
    } else if (name === "hypot") {
      if (args.some((arg) => arg.n !== 0 && !unitsEqual(arg.u, unit))) return null;
      n = Math.hypot(...args.map((arg) => arg.n));
    } else if (name === "mod" || name === "rem") {
      if (args.length !== 2) return null;
      const a = args[0];
      const b = args[1];
      if (!a || !b) return null;
      const aHas = Object.keys(a.u).length > 0;
      const bHas = Object.keys(b.u).length > 0;
      if (aHas !== bHas || (aHas && !unitsEqual(a.u, b.u))) return null;
      n = name === "mod" ? cssMod(a.n, b.n) : cssRem(a.n, b.n);
      return { n, u: aHas ? a.u : blankUnits(), i: cursor };
    } else if (name === "round") {
      if (args.length !== 1 && args.length !== 2) return null;
      const a = args[0];
      const b = args[1];
      if (!a) return null;
      if (!b && Object.keys(a.u).length) return null;
      if (b) {
        const aHas = Object.keys(a.u).length > 0;
        const bHas = Object.keys(b.u).length > 0;
        if (aHas !== bHas || (aHas && !unitsEqual(a.u, b.u))) return null;
      }
      n = cssRound(strategy || "nearest", a.n, b?.n ?? 1);
      return { n, u: a.u, i: cursor };
    } else if (name === "sin" || name === "cos" || name === "tan") {
      if (args.length !== 1 || !args[0]) return null;
      const sc = angleSinCos(args[0]);
      if (!sc) return null;
      if (name === "tan") {
        if (sc.cos === 0) return { n: Number.NaN, u: blankUnits(), i: cursor };
        n = sc.sin / sc.cos;
      } else n = name === "sin" ? sc.sin : sc.cos;
      return { n, u: blankUnits(), i: cursor };
    } else if (name === "exp") {
      if (args.length !== 1 || !args[0] || Object.keys(args[0].u).length) return null;
      n = Math.exp(args[0].n);
      return { n, u: blankUnits(), i: cursor };
    } else if (name === "asin" || name === "acos" || name === "atan" || name === "atan2") {
      const ang = inverseAngle(name, args);
      if (ang == null) return null;
      return { n: ang, u: ang === 0 ? blankUnits() : { rad: 1 }, i: cursor };
    } else if (args.length !== 1) return null;
    else n = args[0]?.n ?? Number.NaN;
    return { n, u: unit, i: cursor };
  }
  return null;
}

function coeffOf(arg: string, hidden: Set<string>): number | null {
  const compact = arg.replace(/!important/gi, "").replace(/\s+/g, "");
  if (!compact) return null;
  if (hidesAsZero(compact)) return 0;
  const parsed = parseMathSum(compact, 0);
  if (parsed && parsed.i === compact.length && Number.isFinite(parsed.n)) return parsed.n;
  if (valueCanHide(arg, hidden, hidesAsZero)) return 0;
  return null;
}

/** matrix() that flattens the page is the same hide as scale(0). A turn written as rotate stays. */
function matrixFlattens(value: string, hidden: Set<string>): boolean {
  const found = namedFunctionCalls(value, ["matrix3d", "matrix"]);
  return found.some((call) => {
    const nums = splitArgs(call.inner).map((arg) => coeffOf(arg, hidden));
    if (call.name === "matrix") {
      if (nums.length < 4) return false;
      const [a, b, c, d] = nums;
      if (a == null || b == null || c == null || d == null) return false;
      return a * d - b * c === 0;
    }
    if (nums.length < 16) return false;
    const a1 = nums[0];
    const b1 = nums[1];
    const a2 = nums[4];
    const b2 = nums[5];
    if (a1 == null || b1 == null || a2 == null || b2 == null) return false;
    return a1 * b2 - b1 * a2 === 0;
  });
}

function namedFunctionCalls(value: string, names: string[]): { name: string; inner: string }[] {
  const wanted = [...names].sort((a, b) => b.length - a.length);
  const found: { name: string; inner: string }[] = [];
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
    let matched = "";
    if (i === 0 || !/[A-Za-z0-9_-]/.test(value[i - 1] ?? "")) {
      for (const name of wanted) {
        if (value.slice(i, i + name.length).toLowerCase() !== name) continue;
        const after = i + name.length;
        if (/[A-Za-z0-9_-]/.test(value[after] ?? "")) continue;
        matched = name;
        break;
      }
    }
    if (!matched) {
      i += 1;
      continue;
    }
    let j = i + matched.length;
    while (value[j] === " " || value[j] === "\t" || value[j] === "\n" || value[j] === "\r" || value[j] === "\f") j += 1;
    if (value[j] !== "(") {
      i += 1;
      continue;
    }
    const end = matchingParen(value, j);
    if (end < 0) {
      i += 1;
      continue;
    }
    found.push({ name: matched, inner: value.slice(j + 1, end) });
    i = end + 1;
  }
  return found;
}

const ANIM_KEYWORDS = new Set([
  "none",
  "infinite",
  "forwards",
  "backwards",
  "both",
  "alternate",
  "alternate-reverse",
  "normal",
  "linear",
  "ease",
  "ease-in",
  "ease-out",
  "ease-in-out",
  "step-start",
  "step-end",
  "running",
  "paused",
  "initial",
  "inherit",
  "unset",
  "reverse",
  "scroll",
  "auto",
  "cubic-bezier",
  "steps",
]);

function animationIdents(value: string): string[] {
  const names: string[] = [];
  for (const part of splitArgs(value)) {
    const tokens = part.match(/[A-Za-z_][\w-]*/g) ?? [];
    for (const token of tokens) {
      if (ANIM_KEYWORDS.has(token.toLowerCase())) continue;
      names.push(token);
    }
  }
  return names;
}

function declarationUsesHidingAnim(piece: string, anims: Set<string>): boolean {
  if (!anims.size) return false;
  const idx = piece.indexOf(":");
  if (idx <= 0) return false;
  const prop = piece.slice(0, idx).trim().toLowerCase().replace(/\s+/g, "");
  if (prop !== "animation" && prop !== "animation-name" && prop !== "-webkit-animation" && prop !== "-webkit-animation-name") return false;
  return animationIdents(piece.slice(idx + 1)).some((name) => anims.has(name));
}

function matchingBrace(value: string, open: number): number {
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
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function hidingKeyframeNames(css: string, hidden: Set<string>): Set<string> {
  const names = new Set<string>();
  const re = /@(?:-webkit-)?keyframes\s+([A-Za-z_][\w-]*)\s*\{/gi;
  for (const hit of css.matchAll(re)) {
    const name = hit[1] ?? "";
    const open = (hit.index ?? 0) + hit[0].length - 1;
    const close = matchingBrace(css, open);
    if (!name || close < 0) continue;
    const parts = css.slice(open + 1, close).split(/[{};]/);
    if (parts.some((part) => declarationHidesDesk(part.trim(), hidden))) names.add(name);
  }
  return names;
}

type DeskEl = { tag: string; index: number; count: number; ofType: number; ofTypeCount: number };

const HTML_EL: DeskEl = { tag: "html", index: 1, count: 1, ofType: 1, ofTypeCount: 1 };
const BODY_EL: DeskEl = { tag: "body", index: 2, count: 2, ofType: 1, ofTypeCount: 1 };
const HEAD_EL: DeskEl = { tag: "head", index: 1, count: 2, ofType: 1, ofTypeCount: 1 };

function attrMatchesDesk(inner: string, el: DeskEl): boolean {
  if (el.tag !== "html") return false;
  const match = /^([a-zA-Z_][\w:.-]*)(?:\s*([~|^$*]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\s]+)))?(?:\s+[iIsS])?\s*$/.exec(inner.trim());
  if (!match) return false;
  const name = (match[1] ?? "").toLowerCase();
  const op = match[2] ?? "";
  const value = (match[3] ?? match[4] ?? match[5] ?? "").toLowerCase();
  if (name === "data-theme" || name === "data-device" || name === "data-native" || name === "data-orientation" || name === "data-ink-only" || name === "data-focus-mode") return true;
  if (name !== "lang") return false;
  if (!op) return true;
  const want = "en";
  if (op === "=" || op === "~=") return value === want;
  if (op === "|=") return want === value || want.startsWith(`${value}-`);
  if (op === "^=") return Boolean(value) && want.startsWith(value);
  if (op === "$=") return Boolean(value) && want.endsWith(value);
  if (op === "*=") return Boolean(value) && want.includes(value);
  return false;
}

function nthHits(formula: string, index: number): boolean | null {
  const f = formula.replace(/\s+/g, "").toLowerCase();
  if (!f) return null;
  let a = 0;
  let b = 0;
  if (f === "odd") {
    a = 2;
    b = 1;
  } else if (f === "even") {
    a = 2;
    b = 0;
  } else if (/^[+-]?\d+$/.test(f)) {
    b = Number(f);
  } else {
    const m = /^([+-]?)(\d+)?n(.*)$/.exec(f);
    if (!m) return null;
    const sign = m[1] === "-" ? -1 : 1;
    a = sign * (m[2] ? Number(m[2]) : 1);
    const rest = m[3] || "";
    if (rest) {
      const bM = /^([+-])(\d+)$/.exec(rest);
      if (!bM) return null;
      b = Number(`${bM[1]}${bM[2]}`);
    }
  }
  if (a === 0) return index === b;
  const k = (index - b) / a;
  return Number.isInteger(k) && k >= 0;
}

function splitSelectorList(value: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  let quote = "";
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
    if (ch === "(") depth += 1;
    if (ch === ")" && depth > 0) depth -= 1;
    if (ch === "," && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

const STATE_PSEUDO =
  /^(?:hover|focus|focus-visible|focus-within|active|visited|link|any-link|target|scope|empty|checked|disabled|enabled|blank|fullscreen|modal|popover-open|playing|paused|user-valid|user-invalid|required|optional|read-only|read-write|indeterminate|default|valid|invalid|in-range|out-of-range|placeholder-shown|autofill|defined|host|host-context|current|past|future)$/i;

function compoundMatches(compound: string, el: DeskEl): boolean {
  let i = 0;
  let sawType = false;
  const text = compound.trim();
  if (!text) return false;
  while (i < text.length) {
    const ch = text[i] ?? "";
    if (!sawType && (ch === "*" || ch === "|" || /[A-Za-z_]/.test(ch))) {
      const typed = /^((?:\*|[A-Za-z_][\w-]*)\|)?(\*|[A-Za-z_][\w-]*)/.exec(text.slice(i));
      if (!typed) return false;
      const prefix = typed[1] ?? "";
      const type = (typed[2] ?? "").toLowerCase();
      if (prefix && prefix !== "*|") return false;
      if (type !== "*" && type !== el.tag) return false;
      sawType = true;
      i += typed[0].length;
      continue;
    }
    if (ch === "#") return false;
    if (ch === ".") {
      const cls = /^\.([A-Za-z_][\w-]*)/.exec(text.slice(i));
      if (!cls) return false;
      if (el.tag !== "html" || (cls[1] ?? "").toLowerCase() !== "antialiased") return false;
      sawType = true;
      i += cls[0].length;
      continue;
    }
    if (ch === "[") {
      let quote = "";
      let j = i + 1;
      for (; j < text.length; j += 1) {
        const c = text[j] ?? "";
        const n = text[j + 1] ?? "";
        if (quote) {
          if (c === "\\" && n) {
            j += 1;
            continue;
          }
          if (c === quote) quote = "";
          continue;
        }
        if (c === '"' || c === "'") {
          quote = c;
          continue;
        }
        if (c === "]") break;
      }
      if (text[j] !== "]") return false;
      if (!attrMatchesDesk(text.slice(i + 1, j), el)) return false;
      sawType = true;
      i = j + 1;
      continue;
    }
    if (ch === ":" && text[i + 1] === ":") return false;
    if (ch !== ":") return false;
    const pseudo = /^:([A-Za-z-]+|\*)/.exec(text.slice(i));
    if (!pseudo) return false;
    const name = (pseudo[1] ?? "").toLowerCase();
    let j = i + pseudo[0].length;
    let arg = "";
    if (text[j] === "(") {
      const end = matchingParen(text, j);
      if (end < 0) return false;
      arg = text.slice(j + 1, end);
      j = end + 1;
    }
    i = j;
    if (name === "root") {
      if (el.tag !== "html") return false;
      continue;
    }
    if (name === "first-child") {
      if (el.index !== 1) return false;
      continue;
    }
    if (name === "last-child") {
      if (el.index !== el.count) return false;
      continue;
    }
    if (name === "only-child") {
      if (el.count !== 1) return false;
      continue;
    }
    if (name === "first-of-type") {
      if (el.ofType !== 1) return false;
      continue;
    }
    if (name === "last-of-type") {
      if (el.ofType !== el.ofTypeCount) return false;
      continue;
    }
    if (name === "only-of-type") {
      if (el.ofTypeCount !== 1) return false;
      continue;
    }
    if (name === "nth-child" || name === "nth-last-child" || name === "nth-of-type" || name === "nth-last-of-type") {
      const slot =
        name === "nth-child"
          ? el.index
          : name === "nth-last-child"
            ? el.count - el.index + 1
            : name === "nth-of-type"
              ? el.ofType
              : el.ofTypeCount - el.ofType + 1;
      const of = arg.split(/\s+of\s+/i)[0] ?? arg;
      const hit = nthHits(of, slot);
      if (hit !== true) return false;
      continue;
    }
    if (name === "is" || name === "where" || name === "matches" || name === "-webkit-any") {
      if (!splitSelectorList(arg).some((part) => selectorMatchesEl(part, el))) return false;
      continue;
    }
    if (name === "not") {
      if (splitSelectorList(arg).some((part) => selectorMatchesEl(part, el))) return false;
      continue;
    }
    if (name === "lang") continue;
    if (STATE_PSEUDO.test(name)) return false;
    if (name === "before" || name === "after" || name === "first-line" || name === "first-letter" || name === "selection" || name === "placeholder" || name === "marker" || name === "backdrop") return false;
  }
  return sawType || text.startsWith(":");
}

function splitCombinators(selector: string): { combinator: string; compound: string }[] {
  const steps: { combinator: string; compound: string }[] = [];
  let current = "";
  let combinator = "";
  let depth = 0;
  let quote = "";
  const flush = (next: string) => {
    const compound = current.trim();
    if (compound) steps.push({ combinator, compound });
    current = "";
    combinator = next;
  };
  for (let i = 0; i < selector.length; i += 1) {
    const ch = selector[i] ?? "";
    const next = selector[i + 1] ?? "";
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
    if (depth === 0 && (ch === ">" || ch === "+" || ch === "~")) {
      flush(ch);
      continue;
    }
    if (depth === 0 && /\s/.test(ch)) {
      let j = i;
      while (j < selector.length && /\s/.test(selector[j] ?? "")) j += 1;
      const nxt = selector[j] ?? "";
      if (nxt === ">" || nxt === "+" || nxt === "~") {
        flush(nxt);
        i = j;
        continue;
      }
      if (current.trim()) flush(" ");
      continue;
    }
    current += ch;
  }
  if (current.trim()) steps.push({ combinator, compound: current.trim() });
  return steps;
}

function parentEl(el: DeskEl): DeskEl | null {
  if (el.tag === "body" || el.tag === "head") return HTML_EL;
  return null;
}

function prevEl(el: DeskEl): DeskEl | null {
  if (el.tag === "body") return HEAD_EL;
  return null;
}

function matchSteps(steps: { combinator: string; compound: string }[], index: number, el: DeskEl): boolean {
  const step = steps[index];
  if (!step || !compoundMatches(step.compound, el)) return false;
  if (index === 0) return true;
  const comb = step.combinator;
  if (comb === ">") {
    const parent = parentEl(el);
    return Boolean(parent) && matchSteps(steps, index - 1, parent as DeskEl);
  }
  if (comb === " ") {
    let ancestor = parentEl(el);
    while (ancestor) {
      if (matchSteps(steps, index - 1, ancestor)) return true;
      ancestor = parentEl(ancestor);
    }
    return false;
  }
  if (comb === "+" || comb === "~") {
    let sib = prevEl(el);
    while (sib) {
      if (matchSteps(steps, index - 1, sib)) return true;
      if (comb === "+") return false;
      sib = prevEl(sib);
    }
    return false;
  }
  return false;
}

function selectorMatchesEl(selector: string, el: DeskEl): boolean {
  const trimmed = selector.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.includes("::")) return false;
  const steps = splitCombinators(trimmed);
  if (!steps.length) return false;
  return matchSteps(steps, steps.length - 1, el);
}

function selectorMatchesDesk(selector: string): boolean {
  return splitSelectorList(selector).some((part) => {
    const sel = part.trim();
    if (!sel || sel.includes("::")) return false;
    return selectorMatchesEl(sel, HTML_EL) || selectorMatchesEl(sel, BODY_EL);
  });
}

function scrubNestedBody(body: string, hidden: Set<string>, anims: Set<string>, desk: boolean): string {
  if (!body.includes("{")) return desk ? scrubHideBody(body, hidden, anims) : body.trim();
  let out = "";
  let decl = "";
  let i = 0;
  let depth = 0;
  let quote = "";
  const keep = (piece: string) => {
    const next = piece.trim();
    if (!next) return;
    if (!desk || (!declarationHidesDesk(next, hidden) && !declarationUsesHidingAnim(next, anims))) out += `${next}; `;
  };
  while (i < body.length) {
    const ch = body[i] ?? "";
    const next = body[i + 1] ?? "";
    if (quote) {
      decl += ch;
      if (ch === "\\" && next) {
        decl += next;
        i += 2;
        continue;
      }
      if (ch === quote) quote = "";
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      decl += ch;
      i += 1;
      continue;
    }
    if (ch === "(") {
      depth += 1;
      decl += ch;
      i += 1;
      continue;
    }
    if (ch === ")" && depth > 0) {
      depth -= 1;
      decl += ch;
      i += 1;
      continue;
    }
    if (ch === "{" && depth === 0) {
      const selector = decl.trim();
      const close = matchingBrace(body, i);
      if (close < 0) return `${out}${body.slice(i)}`;
      const childDesk = selectorMatchesDesk(selector) || (desk && selector.replace(/\s+/g, "") === "&");
      out += `${selector}{${scrubNestedBody(body.slice(i + 1, close), hidden, anims, childDesk)}}`;
      decl = "";
      i = close + 1;
      continue;
    }
    if (ch === ";" && depth === 0) {
      keep(decl);
      decl = "";
      i += 1;
      continue;
    }
    decl += ch;
    i += 1;
  }
  const tail = decl.trim();
  if (tail && (!desk || (!declarationHidesDesk(tail, hidden) && !declarationUsesHidingAnim(tail, anims)))) out += tail;
  return out.replace(/;\s*$/g, "").trim();
}

const RECURSE_AT = /^(?:media|supports|layer|container|scope|document)$/i;

function scrubLooseDeskRules(css: string, hidden: Set<string>, anims: Set<string>): string {
  let out = "";
  let i = 0;
  while (i < css.length) {
    if (css[i] === "@") {
      const name = /^@(-?[\w-]+)/.exec(css.slice(i));
      if (!name) {
        out += css[i];
        i += 1;
        continue;
      }
      const kind = (name[1] ?? "").replace(/^-webkit-/, "");
      let j = i + name[0].length;
      if (/keyframes/i.test(kind) || /^(?:font-face|page|counter-style|property)$/i.test(kind)) {
        const open = css.indexOf("{", j);
        const semi = css.indexOf(";", j);
        if (open < 0 || (semi >= 0 && semi < open)) {
          const end = semi < 0 ? css.length : semi + 1;
          out += css.slice(i, end);
          i = end;
          continue;
        }
        const close = matchingBrace(css, open);
        const end = close < 0 ? css.length : close + 1;
        out += css.slice(i, end);
        i = end;
        continue;
      }
      if (RECURSE_AT.test(kind)) {
        const open = css.indexOf("{", j);
        if (open < 0) {
          out += css.slice(i);
          break;
        }
        const close = matchingBrace(css, open);
        if (close < 0) {
          out += css.slice(i);
          break;
        }
        out += css.slice(i, open + 1);
        out += scrubLooseDeskRules(css.slice(open + 1, close), hidden, anims);
        out += "}";
        i = close + 1;
        continue;
      }
    }
    const open = css.indexOf("{", i);
    if (open < 0) {
      out += css.slice(i);
      break;
    }
    const selector = css.slice(i, open);
    const close = matchingBrace(css, open);
    if (close < 0) {
      out += css.slice(i);
      break;
    }
    if (selectorMatchesDesk(selector)) out += `${selector}{${scrubNestedBody(css.slice(open + 1, close), hidden, anims, true)}}`;
    else out += css.slice(i, close + 1);
    i = close + 1;
  }
  return out;
}

function scrubDeskHide(css: string, hidden: Set<string>) {
  const anims = hidingKeyframeNames(css, hidden);
  let out = css;
  out = out.replace(
    /(^|[{},]\s*)(\*(?![A-Za-z0-9_-])(?:(?::[a-zA-Z-]+(?:\([^)]*\))?)*)\s*)\{([^}]*)\}/g,
    (_all, pre: string, sel: string, body: string) => `${pre}${sel}{${scrubHideBody(body, hidden, anims)}}`,
  );
  out = out.replace(
    /(^|[{},]\s*)((?::is|:where|:matches|:-webkit-any)\(([^()]*)\)(?:(?::[a-zA-Z-]+(?:\([^)]*\))?)*)\s*)\{([^}]*)\}/gi,
    (all, pre: string, sel: string, inner: string, body: string) => {
      if (!hasUniversalArgument(inner)) return all;
      return `${pre}${sel}{${scrubHideBody(body, hidden, anims)}}`;
    },
  );
  out = out.replace(/(^|[{}])\s*([^{};]+)\{([^}]*)\}/g, (all, pre: string, selector: string, body: string) => {
    if (body.includes("{") || !isStarPairSelector(selector)) return all;
    return `${pre}${selector}{${scrubHideBody(body, hidden, anims)}}`;
  });
  return scrubLooseDeskRules(out, hidden, anims);
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

/** Add-on CSS can restyle the desk. It cannot pull a remote sheet or image, or hide the desk. */
export function sanitizePluginCss(css: string): string {
  const readable = stripCssComments(decodeCssEscapes(stripCssComments(css), false));
  const cleaned = scrubAttrUrls(scrubRemoteImageCalls(scrubPluginCss(readable)));
  return scrubDeskHide(cleaned, collectHideVars(cleaned));
}
