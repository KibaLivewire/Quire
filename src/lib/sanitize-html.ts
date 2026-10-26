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

/** A negative opacity, brightness, or contrast is clamped to zero. A negative scale is a flip and is not. */
function clampsToZero(value: string): boolean {
  if (hidesAsZero(value)) return true;
  const s = value.replace(/!important/gi, "").replace(/\s+/g, "");
  if (!s) return false;
  const parsed = parseMathSum(s, 0);
  if (!parsed || parsed.i !== s.length || !Number.isFinite(parsed.n) || parsed.n >= 0) return false;
  const units = Object.keys(parsed.u).filter((key) => parsed.u[key]);
  return units.length === 0 || (units.length === 1 && units[0] === "%");
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

function wholeFunction(value: string, name: string): boolean {
  const trimmed = value.trim();
  const calls = namedFunctionCalls(trimmed, [name]);
  if (calls.length !== 1 || !calls[0]) return false;
  return trimmed.replace(/\s+/g, "").toLowerCase() === `${name}(${calls[0].inner})`.replace(/\s+/g, "").toLowerCase();
}

function valueCanHide(value: string, hidden: Set<string>, pred: (v: string) => boolean, seen?: Set<string>): boolean {
  if (wholeFunction(value, "if")) return ifCanHide(value, hidden, pred, seen);
  if (pred(value)) return true;
  if (ifCanHide(value, hidden, pred, seen)) return true;
  const trail = seen ?? new Set<string>();
  const defined = (hidden as HideVars).defined;
  for (const call of varCalls(value)) {
    if (hidden.has(call.name)) return true;
    const raw = defined?.get(call.name);
    if (raw && !trail.has(call.name)) {
      const next = new Set(trail);
      next.add(call.name);
      if (valueCanHide(raw, hidden, pred, next)) return true;
    }
    if (call.fallback && valueCanHide(call.fallback, hidden, pred, trail)) return true;
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

/** A polygon with no area hides the element. A triangle stays. A calculation that is not a bare zero stays. */
function polygonAreaZero(inner: string): boolean {
  let body = inner.trim().replace(/^(?:evenodd|nonzero)\s*,\s*/i, "");
  let prev = "";
  while (body !== prev) {
    prev = body;
    body = body.replace(/calc\([^()]*\)/gi, (all) => (hidesAsZero(all) ? "0" : all));
  }
  if (/[a-z]/i.test(body.replace(/(?:%|px|em|rem)/gi, ""))) return false;
  const nums = [...body.matchAll(/([+-]?(?:\d*\.?\d+)(?:e[+-]?\d+)?)(%|px|em|rem)?/gi)];
  if (nums.length < 6 || nums.length % 2 !== 0) return false;
  let unit = "";
  let bareNonZero = false;
  for (const item of nums) {
    const u = (item[2] ?? "").toLowerCase();
    const n = Number(item[1]);
    if (!Number.isFinite(n)) return false;
    if (!u) {
      if (n !== 0) bareNonZero = true;
      continue;
    }
    if (!unit) unit = u;
    else if (u !== unit) return false;
  }
  if (bareNonZero && unit) return false;
  const pts: [number, number][] = [];
  for (let i = 0; i < nums.length; i += 2) {
    const x = Number(nums[i]?.[1]);
    const y = Number(nums[i + 1]?.[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    pts.push([x, y]);
  }
  let area = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const next = pts[(i + 1) % pts.length] ?? pts[0];
    const point = pts[i];
    if (!point || !next) return false;
    area += point[0] * next[1] - next[0] * point[1];
  }
  return area === 0;
}

function resolvedSide(token: string): { n: number; unit: string } | null {
  const t = token.replace(/!important/gi, "").replace(/\s+/g, "");
  if (!t || !/^[-+0-9.(a-z]/i.test(t)) return null;
  const parsed = parseMathSum(t, 0);
  if (!parsed || parsed.i !== t.length || !Number.isFinite(parsed.n)) return null;
  const units = Object.entries(parsed.u).filter(([, exp]) => exp);
  if (units.length > 1) return null;
  if (!units.length) return { n: parsed.n, unit: "" };
  const unit = units[0]?.[0] ?? "";
  const exp = units[0]?.[1] ?? 0;
  if (exp !== 1) return null;
  if (unit !== "%" && unit !== "px" && unit !== "em" && unit !== "rem") return null;
  return { n: parsed.n, unit };
}

type InsetSide = { kind: "pct" | "zero" | "len"; n: number };

function insetSide(token: string, hidden: Set<string>): InsetSide | null {
  const t = token.replace(/!important/gi, "").trim();
  if (!t) return null;
  if (valueCanHide(t, hidden, hidesAsZero)) return { kind: "zero", n: 0 };
  const resolved = resolvedSide(t);
  if (!resolved) return null;
  if (resolved.unit === "%") return { kind: "pct", n: resolved.n };
  if (resolved.n === 0) return { kind: "zero", n: 0 };
  if (!resolved.unit) return null;
  return { kind: "len", n: resolved.n };
}

function insetPairCovers(a: InsetSide, b: InsetSide): boolean {
  const aval = a.kind === "zero" ? 0 : a.kind === "pct" ? a.n : null;
  const bval = b.kind === "zero" ? 0 : b.kind === "pct" ? b.n : null;
  if (aval != null && bval != null) return aval + bval >= 100;
  if (a.kind === "pct" && a.n >= 100 && b.kind === "len" && b.n >= 0) return true;
  if (b.kind === "pct" && b.n >= 100 && a.kind === "len" && a.n >= 0) return true;
  return false;
}

function alphaIsClear(token: string): boolean {
  return /^none$/i.test(token.trim()) || hidesAsZero(token);
}

function fnAlphaClear(name: string, inner: string): boolean {
  const slash = inner.lastIndexOf("/");
  if (slash >= 0) return alphaIsClear(inner.slice(slash + 1));
  if (name === "rgb" || name === "rgba" || name === "hsl" || name === "hsla" || name === "hwb") {
    const parts = splitArgs(inner)
      .map((part) => part.trim())
      .filter(Boolean);
    const last = parts[parts.length - 1] ?? "";
    return parts.length >= 4 && alphaIsClear(last);
  }
  return false;
}

function blankColorFns(value: string): string {
  let out = "";
  let i = 0;
  while (i < value.length) {
    const m = /^(?:color-mix|light-dark|oklch|oklab|rgba|hsla|hwb|rgb|hsl|lab|lch|color)\b/i.exec(value.slice(i));
    if (m && (i === 0 || !/[A-Za-z0-9_-]/.test(value[i - 1] ?? ""))) {
      let j = i + m[0].length;
      while (/\s/.test(value[j] ?? "")) j += 1;
      if (value[j] === "(") {
        const end = matchingParen(value, j);
        if (end >= 0) {
          out += " ";
          i = end + 1;
          continue;
        }
      }
    }
    out += value[i] ?? "";
    i += 1;
  }
  return out;
}

const COLOR_FNS = ["color-mix", "light-dark", "oklch", "oklab", "rgba", "hsla", "hwb", "rgb", "hsl", "lab", "lch", "color"];

function pieceIsClearColor(value: string): boolean {
  const token = value.trim();
  if (!token) return false;
  if (/^transparent$/i.test(token)) return true;
  const hex = token.toLowerCase();
  if (/^#[0-9a-f]{3,8}$/.test(hex)) {
    return (/^#[0-9a-f]{4}$/.test(hex) && hex[4] === "0") || (/^#[0-9a-f]{8}$/.test(hex) && hex.slice(7) === "00");
  }
  const calls = namedFunctionCalls(token, COLOR_FNS);
  if (calls.length !== 1) return false;
  const call = calls[0];
  if (!call) return false;
  if (token.replace(/\s+/g, "").toLowerCase() !== `${call.name}(${call.inner.replace(/\s+/g, "")})`.toLowerCase()) return false;
  return colorCallIsClear(call.name, call.inner);
}

function colorCallIsClear(name: string, inner: string): boolean {
  const n = name.toLowerCase();
  if (n === "rgb" || n === "rgba" || n === "hsl" || n === "hsla" || n === "hwb") return fnAlphaClear(n, inner);
  if (n === "color" || n === "oklch" || n === "oklab" || n === "lab" || n === "lch") {
    const slash = inner.lastIndexOf("/");
    if (slash < 0) return false;
    return alphaIsClear(inner.slice(slash + 1));
  }
  if (n === "light-dark") {
    const parts = splitArgs(inner).map((part) => part.trim()).filter(Boolean);
    return parts.length === 2 && parts.every((part) => pieceIsClearColor(part));
  }
  if (n === "color-mix") {
    let body = inner.trim();
    if (/^in\b/i.test(body)) {
      const split = splitTopComma(body);
      if (!split.tail.trim()) return false;
      body = split.tail;
    }
    const colors = splitArgs(body).map((part) => part.trim()).filter(Boolean);
    if (colors.length < 2) return false;
    return colors.every((part) => pieceIsClearColor(part.replace(/\s+\d*\.?\d+%$/, "").trim()));
  }
  return false;
}

const MASK_SKIP = new Set(["to", "top", "bottom", "left", "right", "center", "at", "circle", "ellipse", "closest-side", "farthest-side", "closest-corner", "farthest-corner", "from", "deg", "rad", "turn", "grad", "in", "srgb"]);

function gradientIsClear(inner: string): boolean {
  const fns = namedFunctionCalls(inner, COLOR_FNS);
  if (fns.some((fn) => !colorCallIsClear(fn.name, fn.inner))) return false;
  const tokens = blankColorFns(inner).match(/#[0-9a-fA-F]{3,8}|[A-Za-z]+/g) ?? [];
  let saw = fns.length > 0;
  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (MASK_SKIP.has(lower)) continue;
    if (lower === "transparent") {
      saw = true;
      continue;
    }
    if (token.startsWith("#")) {
      saw = true;
      const hex = token.toLowerCase();
      const clear = (/^#[0-9a-f]{4}$/.test(hex) && hex[4] === "0") || (/^#[0-9a-f]{8}$/.test(hex) && hex.slice(7) === "00");
      if (!clear) return false;
      continue;
    }
    return false;
  }
  return saw;
}

function maskIsClear(value: string): boolean {
  const grads = namedFunctionCalls(value, ["repeating-linear-gradient", "repeating-radial-gradient", "repeating-conic-gradient", "-webkit-linear-gradient", "-webkit-radial-gradient", "linear-gradient", "radial-gradient", "conic-gradient"]);
  if (!grads.length) return false;
  return grads.every((grad) => gradientIsClear(grad.inner));
}

/** A custom property set to a clear mask follows that mask. A gradient that still has black stays. */
function maskHides(value: string, hidden: Set<string>): boolean {
  if (maskIsClear(value)) return true;
  const masks = (hidden as HideVars).masks;
  if (!masks) return false;
  return varCalls(value).some((call) => masks.has(call.name) || (Boolean(call.fallback) && maskHides(call.fallback, hidden)));
}

function splitTopSemi(value: string): string[] {
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
    if (ch === ";" && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

const CSS_COLORS = new Set(
  "transparent currentcolor black silver gray grey white maroon red purple fuchsia green lime olive yellow navy blue teal aqua aliceblue antiquewhite aqua aquamarine azure beige bisque blanchedalmond blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgrey darkgreen darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen gainsboro ghostwhite gold goldenrod greenyellow honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgrey lightgreen lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow limegreen linen magenta mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite oldlace olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue rebeccapurple rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna skyblue slateblue slategray slategrey snow springgreen steelblue tan thistle tomato turquoise violet wheat whitesmoke yellowgreen".split(
    " ",
  ),
);

function supportsColor(cond: string): boolean {
  const m = /^supports\(color:(.+)\)$/.exec(cond);
  if (!m) return false;
  const value = m[1] ?? "";
  if (CSS_COLORS.has(value)) return true;
  if (/^#[0-9a-f]{3,8}$/.test(value)) return true;
  return /^(?:rgba?|hsla?)\((?:[0-9.]+%?,)*[0-9.]+%?\)$/.test(value);
}

/** A colour this page can already paint, including a modern function the compacted check misses. */
function supportsModernColor(cond: string): boolean {
  const m = /^supports\(\s*color\s*:\s*([\s\S]+)\)$/i.exec(cond.trim());
  if (!m) return false;
  const value = (m[1] ?? "").trim().toLowerCase();
  const flat = value.replace(/\s+/g, "");
  if (CSS_COLORS.has(flat) || /^#[0-9a-f]{3,8}$/.test(flat)) return true;
  const num = "none|-?\\d*\\.?\\d+%?";
  if (new RegExp(`^(?:rgba?|hsla?|hwb)\\(\\s*(?:${num})(?:[\\s,]+(?:${num})){2}(?:(?:[\\s,]+|\\s*/\\s*)(?:${num}))?\\s*\\)$`).test(value)) return true;
  if (new RegExp(`^color\\(\\s*(?:srgb|srgb-linear|display-p3|a98-rgb|prophoto-rgb|rec2020|xyz(?:-d(?:50|65))?)\\s+(?:${num})(?:\\s+(?:${num})){2}(?:\\s*\\/\\s*(?:${num}))?\\s*\\)$`).test(value)) return true;
  if (new RegExp(`^(?:oklch|oklab|lab|lch)\\(\\s*(?:${num})(?:\\s+(?:${num})){2}(?:\\s*\\/\\s*(?:${num}))?\\s*\\)$`).test(value)) return true;
  return false;
}

function definedMatches(defined: Map<string, string> | undefined, name: string, want: string): boolean {
  if (!defined) return false;
  const have = defined.get(name);
  if (have == null) return false;
  const norm = (value: string) => value.replace(/!important/gi, "").replace(/\s+/g, "").toLowerCase();
  return norm(have) === norm(want);
}

const DISPLAY_YES = /^(?:block|flex|inline-flex|grid|inline-grid|flow-root|inline|inline-block|contents|list-item|table|inline-table|table-row|table-cell|table-column|table-column-group|table-caption|table-header-group|table-row-group|table-footer-group|ruby|ruby-base|ruby-text|-webkit-box|-webkit-inline-box)$/;
const POSITION_YES = /^(?:static|relative|absolute|fixed|sticky)$/;
const OVERFLOW_YES = /^(?:visible|hidden|clip|scroll|auto)$/;
const SYSTEM_COLORS = new Set("canvas canvastext linktext visitedtext activetext buttonface buttontext buttonborder field fieldtext highlight highlighttext mark marktext graytext selecteditem selecteditemtext accentcolor accentcolortext".split(" "));

function unwrapMatchedParens(value: string): string {
  let v = value.trim();
  while (v.startsWith("(")) {
    const end = matchingParen(v, 0);
    if (end !== v.length - 1) break;
    v = v.slice(1, -1).trim();
  }
  return v;
}

function splitTopKeyword(value: string, keyword: string): string[] | null {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  let quote = "";
  const kw = keyword.toLowerCase();
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
    if (depth === 0 && value.slice(i, i + kw.length).toLowerCase() === kw) {
      const before = i === 0 ? "" : (value[i - 1] ?? "");
      const after = value[i + kw.length] ?? "";
      if (!/[A-Za-z0-9_-]/.test(before) && !/[A-Za-z0-9_-]/.test(after)) {
        if (current.trim()) parts.push(current.trim());
        current = "";
        i += kw.length - 1;
        continue;
      }
    }
    current += ch;
  }
  if (!parts.length) return null;
  if (current.trim()) parts.push(current.trim());
  return parts.length > 1 ? parts : null;
}

type Cond = "yes" | "no" | "maybe" | "dead";

function combineBool(states: Cond[], op: "and" | "or"): Cond {
  if (op === "or") {
    if (states.some((state) => state === "yes")) return "yes";
    if (states.some((state) => state === "dead")) return "dead";
    if (states.every((state) => state === "no")) return "no";
    return "maybe";
  }
  if (states.some((state) => state === "dead")) return "dead";
  if (states.some((state) => state === "no")) return "no";
  if (states.every((state) => state === "yes")) return "yes";
  return "maybe";
}

function flipState(state: Cond): Cond {
  if (state === "yes") return "no";
  if (state === "no") return "yes";
  return state;
}

/** A zero length, including a sign, a power of ten, and calc() of zero. 0.01 stays. */
function mediaLengthIsZero(token: string): boolean {
  const t = token.trim().toLowerCase();
  if (calcEvaluatesZero(t) || mathEvaluatesZero(t)) return true;
  return /^[+-]?(?:0+(?:\.0*)?|\.0+)(?:e[+-]?\d+)?(?:px|em|rem|pt|pc|in|cm|mm|q|ch|ex|rcap|cap|ric|ic|rlh|lh|rex|rch|%|(?:[dls])?v(?:w|h|i|b|min|max)|cq(?:w|h|i|b|min|max))?$/.test(t);
}

/** This page is not an indexed screen. color-index is 0. */
function colorIndexState(inner: string): "yes" | "no" | null {
  const num = "([+-]?(?:\\d+\\.?\\d*|\\.\\d+))";
  const read = (token: string): number | null => {
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(token)) return null;
    const n = Number(token);
    return Number.isFinite(n) ? n : null;
  };
  const colon = new RegExp(`^(min-color-index|max-color-index|color-index):${num}$`).exec(inner);
  if (colon) {
    const n = read(colon[2] ?? "");
    if (n == null) return null;
    if (colon[1] === "min-color-index") return n <= 0 ? "yes" : "no";
    if (colon[1] === "max-color-index") return n >= 0 ? "yes" : "no";
    return n === 0 ? "yes" : "no";
  }
  const left = new RegExp(`^color-index(<=|>=|<|>|=)${num}$`).exec(inner);
  if (left) {
    const n = read(left[2] ?? "");
    if (n == null) return null;
    const op = left[1] ?? "";
    if (op === ">=") return 0 >= n ? "yes" : "no";
    if (op === "<=") return 0 <= n ? "yes" : "no";
    if (op === ">") return 0 > n ? "yes" : "no";
    if (op === "<") return 0 < n ? "yes" : "no";
    return n === 0 ? "yes" : "no";
  }
  const right = new RegExp(`^${num}(<=|>=|<|>|=)color-index$`).exec(inner);
  if (right) {
    const n = read(right[1] ?? "");
    if (n == null) return null;
    const op = right[2] ?? "";
    if (op === ">=") return n >= 0 ? "yes" : "no";
    if (op === "<=") return n <= 0 ? "yes" : "no";
    if (op === ">") return n > 0 ? "yes" : "no";
    if (op === "<") return n < 0 ? "yes" : "no";
    return n === 0 ? "yes" : "no";
  }
  return null;
}

function mediaLeaf(inner: string): "yes" | "no" | "maybe" {
  if (inner === "all" || inner === "scripting:enabled" || inner === "grid:0" || inner === "min-color:0" || inner === "min-color:1" || inner === "color" || inner === "color-gamut:srgb") return "yes";
  if (inner === "scripting:none" || inner === "scripting:initial-only" || inner === "grid:1" || inner === "monochrome") return "no";
  if (inner === "scripting" || inner === "dynamic-range" || inner === "dynamic-range:standard" || inner === "resolution" || inner === "aspect-ratio" || inner === "horizontal-viewport-segments" || inner === "vertical-viewport-segments" || inner === "-webkit-transform-3d") return "yes";
  if (inner === "orientation" || inner === "display-mode" || inner === "prefers-color-scheme" || inner === "color-gamut" || inner === "width" || inner === "height" || inner === "device-width" || inner === "device-height" || inner === "-webkit-device-pixel-ratio" || inner === "device-aspect-ratio" || inner === "aspect-ratio") return "yes";
  if (inner === "grid" || inner === "color-index" || inner === "dynamic-range:high" || inner === "scan" || /^scan:/.test(inner)) return "no";
  if (/^grid(?:<=|>=|<|>|=)/.test(inner) || /^(?:0+(?:\.0*)?|\.0+|[1-9]\d*)(?:<=|>=|<|>|=)grid$/.test(inner) || /^scripting=/.test(inner)) return "no";
  if (/^monochrome[:=](?:0+(?:\.0*)?|\.0+)$/.test(inner) || /^(?:0+(?:\.0*)?|\.0+)=monochrome$/.test(inner)) return "yes";
  if (/^monochrome(?:>=|<=)(?:0+(?:\.0*)?|\.0+)$/.test(inner) || /^monochrome<1(?:\.0*)?$/.test(inner) || /^(?:0+(?:\.0*)?|\.0+)<=monochrome$/.test(inner)) return "yes";
  if (/^monochrome>(?:0+(?:\.0*)?|\.0+)$/.test(inner) || /^(?:0+(?:\.0*)?|\.0+)<monochrome$/.test(inner)) return "no";
  if (/^monochrome[:=]/.test(inner) || /=monochrome$/.test(inner) || /^monochrome(?:>=|<=|>|<)/.test(inner) || /(?:>=|<=|>|<)monochrome$/.test(inner)) return "no";
  const indexed = colorIndexState(inner);
  if (indexed) return indexed;
  let hit = /^(min-width|min-height):(.+)$/.exec(inner);
  if (hit) return mediaLengthIsZero(hit[2] ?? "") ? "yes" : "maybe";
  hit = /^(max-width|max-height):(.+)$/.exec(inner);
  if (hit) return mediaLengthIsZero(hit[2] ?? "") ? "no" : "maybe";
  hit = /^(width|height)>=(.+)$/.exec(inner);
  if (hit) return mediaLengthIsZero(hit[2] ?? "") ? "yes" : "maybe";
  hit = /^(width|height)<=(.+)$/.exec(inner);
  if (hit) return mediaLengthIsZero(hit[2] ?? "") ? "no" : "maybe";
  hit = /^(.+)<=(width|height)$/.exec(inner);
  if (hit) return mediaLengthIsZero(hit[1] ?? "") ? "yes" : "maybe";
  hit = /^(.+)>=(width|height)$/.exec(inner);
  if (hit) return mediaLengthIsZero(hit[1] ?? "") ? "no" : "maybe";
  hit = /^(width|height)>(.+)$/.exec(inner);
  if (hit) return mediaLengthIsZero(hit[2] ?? "") ? "yes" : "maybe";
  hit = /^(.+)<(width|height)$/.exec(inner);
  if (hit) return mediaLengthIsZero(hit[1] ?? "") ? "yes" : "maybe";
  if (/^min-monochrome:0+(?:\.0+)?$/.test(inner) || /^max-monochrome:0+(?:\.0+)?$/.test(inner)) return "yes";
  if (/^min-monochrome:[1-9]/.test(inner)) return "no";
  if (/^color>=1$/.test(inner) || /^color>0+$/.test(inner) || /^1<=color$/.test(inner) || /^0+<color$/.test(inner)) return "yes";
  if (/^max-color:0+$/.test(inner) || /^color<=0+$/.test(inner) || /^color<1$/.test(inner)) return "no";
  if (/^min-resolution:0(?:dpi|dppx|dpcm|x)$/.test(inner) || /^min-resolution:1dpi$/.test(inner)) return "yes";
  if (/^max-resolution:0(?:dpi|dppx|dpcm|x)$/.test(inner)) return "no";
  if (/^resolution>=0(?:dpi|dppx|dpcm|x)$/.test(inner) || /^resolution>0+(?:\.0+)?(?:dpi|dppx|dpcm|x)$/.test(inner)) return "yes";
  if (/^0+(?:\.0+)?(?:dpi|dppx|dpcm|x)<resolution$/.test(inner)) return "yes";
  if (/^resolution<=0(?:dpi|dppx|dpcm|x)$/.test(inner)) return "no";
  if (/^resolution[:=](?:0+(?:\.0*)?|\.0+)(?:dpi|dppx|dpcm|x)$/.test(inner)) return "no";
  if ((/^(?:min-resolution|max-resolution):/.test(inner) || /^resolution(?:<=|>=|<|>|=)/.test(inner) || /(?:<=|>=|<|>|=)resolution$/.test(inner)) && !/(?:dpi|dppx|dpcm|x)$/.test(inner)) return "no";
  if (/^color>=0+(?:\.0*)?$/.test(inner) || /^0+(?:\.0*)?<=color$/.test(inner)) return "yes";
  const colorCeiling = /^(?:max-color:|color<=)(\d+)$/.exec(inner) ?? /^(\d+)>=color$/.exec(inner);
  if (colorCeiling && Number(colorCeiling[1]) >= 16) return "yes";
  if (/^color[:=](?:0+(?:\.0*)?|\.0+)$/.test(inner) || /^(?:0+(?:\.0*)?|\.0+)=color$/.test(inner)) return "no";
  const minColor = /^min-color:(\d+)$/.exec(inner);
  if (minColor && Number(minColor[1]) > 16) return "no";
  const colorGt = /^color>(\d+)$/.exec(inner);
  if (colorGt && Number(colorGt[1]) >= 16) return "no";
  const colorGe = /^color>=(\d+)$/.exec(inner);
  if (colorGe && Number(colorGe[1]) > 16) return "no";
  const colorEq = /^color[:=](\d+)$/.exec(inner);
  if (colorEq && Number(colorEq[1]) > 16) return "no";
  const colorFrom = /^(\d+)<=color$/.exec(inner);
  if (colorFrom && Number(colorFrom[1]) > 16) return "no";
  const colorBelow = /^(\d+)<color$/.exec(inner);
  if (colorBelow && Number(colorBelow[1]) >= 16) return "no";
  if (inner === "aspect-ratio" || /^min-aspect-ratio:(?:0+(?:\.0*)?|\.0+)\/[1-9]\d*$/.test(inner)) return "yes";
  if (/^aspect-ratio>=(?:0+(?:\.0*)?|\.0+)(?:\/[1-9]\d*)?$/.test(inner) || /^aspect-ratio>(?:0+(?:\.0*)?|\.0+)(?:\/[1-9]\d*)?$/.test(inner)) return "yes";
  if (/^(?:0+(?:\.0*)?|\.0+)(?:\/[1-9]\d*)?<=aspect-ratio$/.test(inner) || /^(?:0+(?:\.0*)?|\.0+)(?:\/[1-9]\d*)?<aspect-ratio$/.test(inner)) return "yes";
  if (/^max-aspect-ratio:(?:0+(?:\.0*)?|\.0+)(?:\/[1-9]\d*)?$/.test(inner) || /^aspect-ratio:(?:0+(?:\.0*)?|\.0+)(?:\/[1-9]\d*)?$/.test(inner)) return "no";
  if (/^(?:horizontal|vertical)-viewport-segments(?:>=1|>0+(?:\.0*)?)$/.test(inner)) return "yes";
  if (/^(?:1<=|0+(?:\.0*)?<)(?:horizontal|vertical)-viewport-segments$/.test(inner)) return "yes";
  if (/^min-(?:horizontal|vertical)-viewport-segments:/.test(inner)) return "no";
  if (/^min-device-(?:width|height):(?:0+(?:\.0*)?|\.0+)(?:px|em|rem|pt|pc|in|cm|mm|q|ch|ex|cap|ic|rlh|lh|rex|rch|vw|vh|vmin|vmax|vb|vi|%)?$/.test(inner)) return "yes";
  if (/^max-device-(?:width|height):(?:0+(?:\.0*)?|\.0+)(?:px|em|rem|pt|pc|in|cm|mm|q|ch|ex|cap|ic|rlh|lh|rex|rch|vw|vh|vmin|vmax|vb|vi|%)?$/.test(inner)) return "no";
  if (/^device-(?:width|height)>=(?:0+(?:\.0*)?|\.0+)(?:px|em|rem|pt|pc|in|cm|mm)?$/.test(inner)) return "yes";
  if (/^(?:0+(?:\.0*)?|\.0+)(?:px|em|rem|pt|pc|in|cm|mm)?<=device-(?:width|height)$/.test(inner)) return "yes";
  const deviceGt = /^device-(?:width|height)>(.+)$/.exec(inner);
  if (deviceGt) return mediaLengthIsZero(deviceGt[1] ?? "") ? "yes" : "maybe";
  const deviceLt = /^(.+)<device-(?:width|height)$/.exec(inner);
  if (deviceLt) return mediaLengthIsZero(deviceLt[1] ?? "") ? "yes" : "maybe";
  if (/^device-aspect-ratio>=(?:0+(?:\.0*)?|\.0+)\/[1-9]\d*$/.test(inner) || /^min-device-aspect-ratio:(?:0+(?:\.0*)?|\.0+)\/[1-9]\d*$/.test(inner)) return "yes";
  if (/^device-aspect-ratio>(?:0+(?:\.0*)?|\.0+)(?:\/[1-9]\d*)?$/.test(inner) || /^(?:0+(?:\.0*)?|\.0+)(?:\/[1-9]\d*)?<device-aspect-ratio$/.test(inner)) return "yes";
  if (/^max-device-aspect-ratio:(?:0+(?:\.0*)?|\.0+)(?:\/[1-9]\d*)?$/.test(inner) || /^device-aspect-ratio[:=](?:0+(?:\.0*)?|\.0+)(?:\/[1-9]\d*)?$/.test(inner)) return "no";
  if (/^-webkit-min-device-pixel-ratio:(?:0+(?:\.0*)?|\.0+)$/.test(inner)) return "yes";
  if (/^-webkit-device-pixel-ratio>=(?:0+(?:\.0*)?|\.0+)$/.test(inner) || /^-webkit-device-pixel-ratio>(?:0+(?:\.0*)?|\.0+)$/.test(inner)) return "yes";
  if (/^(?:0+(?:\.0*)?|\.0+)<=-webkit-device-pixel-ratio$/.test(inner) || /^(?:0+(?:\.0*)?|\.0+)<-webkit-device-pixel-ratio$/.test(inner)) return "yes";
  if (/^-webkit-max-device-pixel-ratio:(?:0+(?:\.0*)?|\.0+)$/.test(inner) || /^-webkit-device-pixel-ratio(?:<=|[:=])(?:0+(?:\.0*)?|\.0+)$/.test(inner)) return "no";
  if (/^(?:0+(?:\.0*)?|\.0+)(?:>=|=)-webkit-device-pixel-ratio$/.test(inner)) return "no";
  return "maybe";
}

/** A comma list is the same or as the word or. A closed set of one feature is still this page. */
const CLOSED_MEDIA: Record<string, string[]> = {
  orientation: ["portrait", "landscape"],
  hover: ["none", "hover"],
  "any-hover": ["none", "hover"],
  pointer: ["none", "coarse", "fine"],
  "any-pointer": ["none", "coarse", "fine"],
  update: ["none", "slow", "fast"],
  "overflow-block": ["none", "scroll", "optional-paged", "paged"],
  "overflow-inline": ["none", "scroll"],
  "dynamic-range": ["standard", "high"],
  "forced-colors": ["none", "active"],
  "prefers-reduced-motion": ["no-preference", "reduce"],
  "prefers-color-scheme": ["light", "dark"],
  "prefers-contrast": ["no-preference", "more", "less", "custom"],
  "prefers-reduced-transparency": ["no-preference", "reduce"],
  "display-mode": ["browser", "fullscreen", "standalone", "minimal-ui", "window-controls-overlay", "picture-in-picture"],
};

/** These names are not this page, even when every value is listed. A zero in the else is the value that is taken. */
const CLOSED_MEDIA_NO: Record<string, string[]> = {
  "video-dynamic-range": ["standard", "high"],
  "inverted-colors": ["none", "inverted"],
  "prefers-reduced-data": ["no-preference", "reduce"],
  "environment-blending": ["opaque", "additive", "subtractive"],
  scan: ["interlace", "progressive"],
  "nav-controls": ["none", "back"],
};

function splitTopCommaList(value: string): string[] | null {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  let quote = "";
  let saw = false;
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
      saw = true;
      if (current.trim()) parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (!saw) return null;
  if (current.trim()) parts.push(current.trim());
  return parts.length > 1 ? parts : null;
}

function closedMediaOr(parts: string[]): "yes" | "no" | null {
  const pairs: { feature: string; value: string }[] = [];
  for (const part of parts) {
    const flat = unwrapMatchedParens(part).replace(/\s+/g, "").toLowerCase();
    const match = /^([a-z][a-z0-9-]*):([a-z0-9-]+)$/.exec(flat);
    if (!match) return null;
    pairs.push({ feature: match[1] ?? "", value: match[2] ?? "" });
  }
  const feature = pairs[0]?.feature ?? "";
  const yes = CLOSED_MEDIA[feature];
  const no = CLOSED_MEDIA_NO[feature];
  const set = yes ?? no;
  if (!set || pairs.some((pair) => pair.feature !== feature || !set.includes(pair.value))) return null;
  if (!set.every((value) => pairs.some((pair) => pair.value === value))) return null;
  return yes ? "yes" : "no";
}

/** if(media()) joins with and/or only when each side is in parentheses. A comma is not an or. */
function mediaPartWrapped(part: string): boolean {
  const trimmed = part.trim();
  return trimmed.startsWith("(") && matchingParen(trimmed, 0) === trimmed.length - 1;
}

function mediaBodyState(inner: string): Cond {
  const raw = unwrapMatchedParens(inner);
  if (splitTopCommaList(raw)) return "dead";
  const ors = splitTopKeyword(raw, "or");
  if (ors) {
    if (ors.some((part) => !mediaPartWrapped(part))) return "dead";
    const closed = closedMediaOr(ors);
    if (closed) return closed;
    return combineBool(ors.map((part) => mediaBodyState(part)), "or");
  }
  const ands = splitTopKeyword(raw, "and");
  if (ands) {
    if (ands.some((part) => !mediaPartWrapped(part))) return "dead";
    return combineBool(ands.map((part) => mediaBodyState(part)), "and");
  }
  if (raw.startsWith("not") && !/[a-z0-9_-]/i.test(raw[3] ?? "")) return flipState(mediaBodyState(raw.slice(3)));
  const typed = mediaTypeState(raw);
  if (typed) return typed;
  return mediaLeaf(unwrapMatchedParens(raw).replace(/\s+/g, "").toLowerCase());
}

/** if(media()) takes a feature, not a media type. A type makes the whole test false. */
function mediaTypeState(raw: string): "yes" | "no" | "maybe" | null {
  let body = unwrapMatchedParens(raw).trim().toLowerCase();
  if (/^only(?![a-z0-9_-])/.test(body)) body = body.slice(4).trim();
  const kind = /^(all|screen|print|speech|aural|tty|tv|projection|handheld|braille|embossed)$/.exec(body)?.[1] ?? "";
  if (!kind) return null;
  return "no";
}

function mediaState(test: string): Cond {
  const trimmed = test.trim();
  const calls = namedFunctionCalls(trimmed, ["media"]);
  if (calls.length !== 1 || !calls[0]) return "maybe";
  const call = calls[0];
  if (trimmed.replace(/\s+/g, "").toLowerCase() !== `media(${call.inner})`.replace(/\s+/g, "").toLowerCase()) return "maybe";
  if (/\b(?:only|all|screen|print|speech|aural|tty|tv|projection|handheld|braille|embossed)\b/i.test(call.inner)) return "no";
  return mediaBodyState(call.inner.trim());
}

function selectorSyntaxOk(sel: string): boolean {
  if (!sel || sel.length > 240) return false;
  if (/[^a-z0-9_#.:[\]()>*+~=|"',^-]/i.test(sel)) return false;
  let depth = 0;
  let bracket = 0;
  for (const ch of sel) {
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth < 0) return false;
    } else if (ch === "[") bracket += 1;
    else if (ch === "]") {
      bracket -= 1;
      if (bracket < 0) return false;
    }
  }
  if (depth !== 0 || bracket !== 0) return false;
  if (!/^[.#:\[*a-z_]/i.test(sel)) return false;
  if (/\(\)/.test(sel) || sel.includes(":::") || /:$/.test(sel)) return false;
  if (/::(?!before|after|first-line|first-letter|placeholder|marker|selection|backdrop|cue)/.test(sel)) return false;
  return true;
}

function cssWideYes(flat: string): "yes" | "maybe" {
  const idx = flat.indexOf(":");
  if (idx <= 0) return "maybe";
  const prop = flat.slice(0, idx);
  const value = flat.slice(idx + 1);
  if (!/^(?:initial|inherit|unset|revert|revert-layer)$/.test(value)) return "maybe";
  if (/^(?:display|position|opacity|color|aspect-ratio|overflow(?:-[xy])?|width|height|inline-size|block-size|min-width|max-width|min-height|max-height|min-inline-size|max-inline-size|min-block-size|max-block-size|font-size|gap|margin|padding|top|left|right|bottom|inset)$/.test(prop)) return "yes";
  return "maybe";
}

const SUPPORT_LEN_NUM = String.raw`[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?`;
const SUPPORT_LEN_UNIT = String.raw`px|em|rem|pt|pc|in|cm|mm|q|ch|ex|cap|ic|rlh|lh|rex|rch|%|vw|vh|vmin|vmax|vb|vi|svw|svh|svmin|svmax|lvw|lvh|lvmin|lvmax|dvw|dvh|dvmin|dvmax|cqw|cqh|cqi|cqb|cqmin|cqmax`;

function supportedLengthToken(value: string): boolean {
  if (/^(?:auto|none|fit-content|min-content|max-content|medium|small|large|x-large|xx-large|xxx-large|smaller|larger|xx-small|x-small)$/.test(value)) return true;
  return new RegExp(`^${SUPPORT_LEN_NUM}(?:${SUPPORT_LEN_UNIT})?$`).test(value);
}

function supportedLengthExpr(value: string): boolean {
  if (supportedLengthToken(value)) return true;
  const wrapped = /^(?:calc|min|max|clamp)\(([\s\S]+)\)$/.exec(value);
  if (!wrapped) return false;
  const inner = (wrapped[1] ?? "").replace(/\s+/g, "");
  if (!inner || !new RegExp(`^(?:${SUPPORT_LEN_NUM}(?:${SUPPORT_LEN_UNIT})?|[,+\\-*/()])+$`).test(inner)) return false;
  return new RegExp(SUPPORT_LEN_NUM).test(inner);
}

function keywordSupport(flat: string, yes: RegExp): "yes" | "no" | "maybe" {
  const value = flat.slice(flat.indexOf(":") + 1);
  if (yes.test(value) || cssWideYes(flat) === "yes") return "yes";
  if (/^[a-z][a-z-]*$/.test(value)) return "no";
  return "maybe";
}

/** A declaration this page can already use. A made-up keyword is not. */
function plainSupportYes(flat: string): boolean {
  if (/^box-sizing:(?:border-box|content-box)$/.test(flat)) return true;
  if (/^(?:transform|translate|rotate|scale|filter|clip-path|float|clear|outline|border|background|list-style|contain):none$/.test(flat)) return true;
  if (/^font-weight:(?:normal|bold|lighter|bolder|[1-9]00)$/.test(flat)) return true;
  if (/^font-style:(?:normal|italic|oblique)$/.test(flat)) return true;
  if (/^white-space:(?:normal|nowrap|pre|pre-wrap|pre-line|break-spaces)$/.test(flat)) return true;
  if (/^text-align:(?:left|right|center|start|end|justify)$/.test(flat)) return true;
  if (/^cursor:(?:auto|default|pointer|none|text)$/.test(flat)) return true;
  if (/^z-index:(?:auto|-?\d+)$/.test(flat)) return true;
  if (/^appearance:(?:none|auto)$/.test(flat)) return true;
  if (/^accent-color:auto$/.test(flat)) return true;
  if (/^caret-color:auto$/.test(flat)) return true;
  if (/^content-visibility:(?:visible|hidden|auto)$/.test(flat)) return true;
  if (/^visibility:(?:visible|hidden|collapse)$/.test(flat)) return true;
  if (/^pointer-events:(?:auto|none)$/.test(flat)) return true;
  if (/^flex-direction:(?:row|column|row-reverse|column-reverse)$/.test(flat)) return true;
  if (/^justify-content:(?:flex-start|center|flex-end|space-between|space-around|space-evenly|start|end)$/.test(flat)) return true;
  if (/^align-items:(?:stretch|center|flex-start|flex-end|baseline|start|end)$/.test(flat)) return true;
  if (/^line-height:(?:normal|\d+\.?\d*|\.\d+)$/.test(flat)) return true;
  if (/^vertical-align:(?:baseline|top|middle|bottom|sub|super|text-top|text-bottom)$/.test(flat)) return true;
  if (/^mix-blend-mode:normal$/.test(flat)) return true;
  if (/^isolation:(?:auto|isolate)$/.test(flat)) return true;
  if (/^object-fit:(?:fill|contain|cover|none|scale-down)$/.test(flat)) return true;
  if (/^overflow-wrap:(?:normal|anywhere|break-word)$/.test(flat)) return true;
  if (/^word-break:(?:normal|break-all|keep-all|break-word)$/.test(flat)) return true;
  if (/^will-change:auto$/.test(flat)) return true;
  if (/^gap:normal$/.test(flat)) return true;
  if (/^opacity:\d+(?:\.\d+)?%$/.test(flat)) return true;
  if (/^scale:(?:none|[+-]?(?:\d+\.?\d*|\.\d+)(?:%)?)$/.test(flat)) return true;
  if (/^font-family:(?:serif|sans-serif|monospace|cursive|fantasy|system-ui|math|emoji|fangsong|ui-serif|ui-sans-serif|ui-monospace|ui-rounded)$/.test(flat)) return true;
  if (/^font-variant:(?:normal|none|small-caps)$/.test(flat)) return true;
  if (/^(?:text-decoration|text-decoration-line):(?:none|underline|overline|line-through)$/.test(flat)) return true;
  if (/^text-transform:(?:none|capitalize|uppercase|lowercase|full-width)$/.test(flat)) return true;
  if (/^(?:letter-spacing|word-spacing):normal$/.test(flat)) return true;
  if (/^float:(?:left|right|none|inline-start|inline-end)$/.test(flat)) return true;
  if (/^clear:(?:left|right|both|none|inline-start|inline-end)$/.test(flat)) return true;
  if (/^flex-wrap:(?:nowrap|wrap|wrap-reverse)$/.test(flat)) return true;
  if (/^order:[+-]?\d+$/.test(flat)) return true;
  if (/^flex:(?:none|auto|[+-]?(?:\d+\.?\d*|\.\d+))$/.test(flat)) return true;
  return false;
}

/** An ordinary property this page can already use. A made-up keyword on that property is not. */
function knownSupportState(flat: string): "yes" | "no" | null {
  const colon = flat.indexOf(":");
  if (colon <= 0) return null;
  const prop = flat.slice(0, colon).trim();
  const value = flat.slice(colon + 1).trim().replace(/\s+/g, " ");
  if (!prop || !value || /[()]/.test(value) || value.includes("--")) return null;
  if (prop === "font-family") return "yes";
  if ((prop === "color-scheme" || prop === "container-name" || prop === "view-transition-name" || prop === "anchor-name" || prop === "animation-name" || prop === "scroll-timeline-name" || prop === "view-timeline-name" || prop === "position-anchor" || prop === "font-palette" || prop === "page") && /^(?:[a-z-][a-z0-9-]*)(?:\s+[a-z-][a-z0-9-]*)*$/.test(value)) return "yes";
  const ident = (allowed: string) => new RegExp(`^(?:${allowed})$`);
  const repeat = (allowed: string, max = 4) => new RegExp(`^(?:${allowed})(?:\\s+(?:${allowed})){0,${max - 1}}$`);
  const keywords: Record<string, RegExp> = {
    "user-select": ident("none|auto|text|all|contain"),
    "-webkit-user-select": ident("none|auto|text|all|contain"),
    "touch-action": repeat("auto|none|manipulation|pan-x|pan-y|pan-left|pan-right|pan-up|pan-down|pinch-zoom"),
    "overscroll-behavior": ident("auto|contain|none"),
    "overscroll-behavior-x": ident("auto|contain|none"),
    "overscroll-behavior-y": ident("auto|contain|none"),
    "scroll-behavior": ident("auto|smooth"),
    resize: ident("none|both|horizontal|vertical|block|inline"),
    quotes: ident("none|auto"),
    "list-style-type": ident("disc|circle|square|decimal|none|disclosure-open|disclosure-closed"),
    "list-style-position": ident("inside|outside"),
    "list-style": repeat("none|disc|circle|square|decimal|inside|outside"),
    "caption-side": ident("top|bottom"),
    "empty-cells": ident("show|hide"),
    "table-layout": ident("auto|fixed"),
    "border-collapse": ident("separate|collapse"),
    "font-kerning": ident("auto|normal|none"),
    "font-optical-sizing": ident("auto|none"),
    "font-synthesis": /^(?:none|(?:weight|style|small-caps)(?:\s+(?:weight|style|small-caps)){0,2})$/,
    "font-synthesis-weight": ident("auto|none"),
    "font-synthesis-style": ident("auto|none"),
    "font-synthesis-small-caps": ident("auto|none"),
    "font-stretch": ident("normal|ultra-condensed|extra-condensed|condensed|semi-condensed|semi-expanded|expanded|extra-expanded|ultra-expanded"),
    "font-size-adjust": ident("none"),
    "font-variant-numeric": repeat("normal|ordinal|slashed-zero|lining-nums|oldstyle-nums|proportional-nums|tabular-nums|diagonal-fractions|stacked-fractions"),
    "font-variant-caps": ident("normal|small-caps|all-small-caps|petite-caps|all-petite-caps|unicase|titling-caps"),
    "font-variant-east-asian": repeat("normal|jis78|jis83|jis90|jis04|simplified|traditional|full-width|proportional-width|ruby"),
    "font-variant-position": ident("normal|sub|super"),
    "font-feature-settings": ident("normal"),
    "font-variation-settings": ident("normal"),
    "font-language-override": ident("normal"),
    hyphens: ident("manual|none|auto"),
    "overflow-anchor": ident("auto|none"),
    "box-decoration-break": ident("slice|clone"),
    "border-style": repeat("none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset"),
    "outline-style": ident("none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset|auto"),
    "border-inline-style": repeat("none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset"),
    "background-repeat": repeat("repeat|no-repeat|repeat-x|repeat-y|space|round"),
    "background-size": repeat("auto|cover|contain"),
    "background-position": repeat("center|top|bottom|left|right"),
    "background-clip": ident("border-box|padding-box|content-box|text"),
    "background-origin": ident("border-box|padding-box|content-box"),
    "background-attachment": ident("scroll|fixed|local"),
    "background-blend-mode": ident("normal|multiply|screen|overlay|darken|lighten|color-dodge|color-burn|hard-light|soft-light|difference|exclusion|hue|saturation|color|luminosity"),
    "object-position": repeat("center|top|bottom|left|right"),
    direction: ident("ltr|rtl"),
    "unicode-bidi": ident("normal|embed|isolate|bidi-override|isolate-override|plaintext"),
    "writing-mode": ident("horizontal-tb|vertical-rl|vertical-lr|sideways-rl|sideways-lr"),
    "text-orientation": ident("mixed|upright|sideways"),
    "text-combine-upright": ident("none|all"),
    "align-content": ident("normal|stretch|center|flex-start|flex-end|space-between|space-around|space-evenly|start|end"),
    "justify-items": ident("normal|stretch|center|start|end|left|right|legacy"),
    "justify-self": ident("auto|normal|stretch|center|start|end|self-start|self-end|left|right|flex-start|flex-end"),
    "align-self": ident("auto|normal|stretch|center|start|end|self-start|self-end|flex-start|flex-end"),
    "place-items": repeat("normal|stretch|center|start|end|self-start|self-end|flex-start|flex-end|baseline"),
    "place-content": repeat("normal|center|start|end|stretch|space-between|space-around|space-evenly"),
    "place-self": repeat("auto|normal|stretch|center|start|end"),
    "grid-auto-flow": /^(?:row|column|dense|row\s+dense|column\s+dense)$/,
    "grid-template-columns": ident("none"),
    "grid-template-rows": ident("none"),
    "grid-area": ident("auto"),
    "break-inside": ident("auto|avoid|avoid-page|avoid-column"),
    "break-before": ident("auto|avoid|avoid-page|avoid-column|always|page|left|right|column"),
    "break-after": ident("auto|avoid|avoid-page|avoid-column|always|page|left|right|column"),
    "page-break-inside": ident("auto|avoid"),
    "image-rendering": ident("auto|crisp-edges|pixelated"),
    "backface-visibility": ident("visible|hidden"),
    "transform-style": ident("flat|preserve-3d"),
    "transform-box": ident("content-box|border-box|fill-box|stroke-box|view-box"),
    "transform-origin": repeat("center|top|bottom|left|right"),
    "offset-path": ident("none"),
    "offset-rotate": ident("auto|reverse"),
    "offset-anchor": ident("auto"),
    offset: ident("none"),
    "scroll-snap-type": /^(?:none|(?:x|y|block|inline|both)(?:\s+(?:mandatory|proximity))?)$/,
    "scroll-snap-align": repeat("none|start|end|center"),
    "scroll-snap-stop": ident("normal|always"),
    "scrollbar-width": ident("auto|thin|none"),
    "scrollbar-gutter": /^(?:auto|stable|both-edges|stable\s+both-edges)$/,
    "scrollbar-color": ident("auto"),
    "print-color-adjust": ident("economy|exact"),
    "color-interpolation": ident("auto|srgb|linearrgb"),
    "color-interpolation-filters": ident("auto|srgb|linearrgb"),
    "font-variant-ligatures": ident("normal|none"),
    "text-align-last": ident("auto|start|end|left|right|center|justify"),
    "border-width": repeat("thin|medium|thick"),
    "outline-width": ident("thin|medium|thick"),
    "border-block-width": repeat("thin|medium|thick"),
    "text-underline-offset": ident("auto"),
    "text-underline-position": repeat("auto|from-font|under|left|right"),
    "text-decoration-thickness": ident("auto|from-font"),
    "text-decoration-skip-ink": ident("auto|none|all"),
    "text-wrap": ident("wrap|nowrap|balance|pretty|stable"),
    "text-wrap-mode": ident("wrap|nowrap"),
    "text-wrap-style": ident("auto|balance|pretty|stable"),
    "white-space-collapse": ident("collapse|preserve|preserve-breaks|preserve-spaces|break-spaces"),
    "line-break": ident("auto|loose|normal|strict|anywhere"),
    "text-emphasis-style": ident("none|filled|open|dot|circle|double-circle|triangle|sesame"),
    "text-shadow": ident("none"),
    "box-shadow": ident("none"),
    "backdrop-filter": ident("none"),
    "mask-image": ident("none"),
    perspective: ident("none"),
    "perspective-origin": repeat("center|top|bottom|left|right"),
    "column-count": ident("auto"),
    "column-span": ident("none|all"),
    "column-fill": ident("balance|auto"),
    "column-rule": ident("none"),
    "column-rule-style": ident("none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset"),
    "column-rule-width": ident("thin|medium|thick"),
    "row-gap": ident("normal"),
    "column-gap": ident("normal"),
    contain: repeat("none|strict|content|size|layout|style|paint"),
    "contain-intrinsic-size": ident("none|auto"),
    "container-type": ident("normal|size|inline-size"),
    "forced-color-adjust": ident("auto|none"),
    "image-orientation": ident("none|from-image"),
    "object-view-box": ident("none"),
    "math-style": ident("normal|compact"),
    "text-rendering": ident("auto|optimizespeed|optimizelegibility|geometricprecision"),
    "field-sizing": ident("fixed|content"),
    "interpolate-size": ident("numeric-only|allow-keywords"),
    "reading-flow": ident("normal"),
    "flex-flow": /^(?:row|column|row-reverse|column-reverse|nowrap|wrap|wrap-reverse)(?:\s+(?:row|column|row-reverse|column-reverse|nowrap|wrap|wrap-reverse))?$/,
    animation: ident("none"),
    "animation-timeline": ident("auto|none"),
    "animation-composition": ident("replace|add|accumulate"),
    "transition-behavior": ident("normal|allow-discrete"),
    transition: ident("none"),
    "transition-property": ident("none|all"),
    "shape-outside": ident("none"),
    "caret-shape": ident("auto|bar|block|underscore"),
    "ruby-position": ident("over|under|alternate|inter-character"),
    "line-clamp": ident("none"),
    "margin-trim": ident("none"),
    "border-image": ident("none"),
    content: ident("none|normal"),
    "counter-reset": ident("none"),
    "counter-increment": ident("none"),
    "position-try-fallbacks": ident("none"),
    "position-visibility": ident("always|anchors-valid|anchors-visible|no-overflow"),
    "-webkit-appearance": ident("none|auto"),
    "-webkit-box-orient": ident("horizontal|vertical|inline-axis|block-axis"),
    zoom: ident("normal"),
  };
  const rule = keywords[prop];
  if (rule?.test(value)) return "yes";
  if ((prop === "flex-grow" || prop === "flex-shrink") && /^(?:\d+\.?\d*|\.\d+)$/.test(value)) return "yes";
  if ((prop === "column-count" || prop === "orphans" || prop === "widows" || prop === "-webkit-line-clamp" || prop === "math-depth") && /^[1-9]\d*$/.test(value)) return "yes";
  if (prop === "math-depth" && /^0$/.test(value)) return "yes";
  if (prop === "columns" && (/^(?:auto|[1-9]\d*)$/.test(value) || supportedLengthExpr(value.replace(/\s+/g, "")))) return "yes";
  if (prop === "flex" && /^(?:none|auto|\d+(?:\.\d+)?(?:\s+\d+(?:\.\d+)?)?(?:\s+(?:auto|none|\d+(?:\.\d+)?(?:px|em|rem|%)?))?)$/.test(value)) return "yes";
  if (prop === "tab-size" && (/^(?:\d+\.?\d*|\.\d+)$/.test(value) || supportedLengthExpr(value.replace(/\s+/g, "")))) return "yes";
  if ((prop === "border-width" || prop === "outline-width" || prop === "border-spacing" || prop === "text-underline-offset" || prop === "text-decoration-thickness" || prop === "perspective" || prop === "column-width" || prop === "column-rule-width" || prop === "border-block-width" || prop === "row-gap" || prop === "column-gap" || prop === "scroll-margin" || prop === "scroll-padding" || prop === "overflow-clip-margin" || prop === "offset-distance" || prop === "shape-margin" || prop === "-webkit-text-size-adjust" || prop === "zoom") && supportedLengthExpr(value.replace(/\s+/g, ""))) return "yes";
  if (rule && /^[a-z][a-z0-9-]*$/.test(value)) return "no";
  if ((prop === "flex-grow" || prop === "flex-shrink" || prop === "column-count" || prop === "orphans" || prop === "widows" || prop === "tab-size" || prop === "zoom") && /^[a-z][a-z0-9-]*$/.test(value) && value !== "normal") return "no";
  return null;
}

function supportsFeatureState(body: string, raw: string): Cond {
  const feature = unwrapMatchedParens(body);
  const ors = splitTopKeyword(feature, "or");
  if (ors) return combineBool(ors.map((part) => supportsFeatureState(part, `supports(${part.trim()})`)), "or");
  const ands = splitTopKeyword(feature, "and");
  if (ands) return combineBool(ands.map((part) => supportsFeatureState(part, `supports(${part.trim()})`)), "and");
  if (/^\s*not(?![a-z0-9_-])/i.test(feature)) return flipState(supportsFeatureState(feature.replace(/^\s*not(?![a-z0-9_-])/i, ""), raw));
  const spaced = feature.replace(/\s+/g, " ").trim().toLowerCase().replace(/\s*!important$/, "");
  const flat = spaced.replace(/\s+/g, "");
  if (flat.startsWith("display:")) {
    const value = flat.slice("display:".length);
    if (value === "none" || DISPLAY_YES.test(value) || cssWideYes(flat) === "yes") return "yes";
    if (/^[a-z][a-z-]*$/.test(value)) return "no";
    return "maybe";
  }
  if (flat.startsWith("position:")) return keywordSupport(flat, POSITION_YES);
  if (/^(?:overflow|overflow-x|overflow-y):/.test(flat)) return keywordSupport(flat, OVERFLOW_YES);
  if (/^opacity:(?:0|1|0?\.\d+|\d+(?:\.\d+)?%)$/.test(flat)) return "yes";
  const colon = flat.indexOf(":");
  const propName = colon > 0 ? flat.slice(0, colon) : "";
  const propValue = colon > 0 ? flat.slice(colon + 1) : "";
  if (/^(?:width|height|inline-size|block-size|min-width|max-width|min-height|max-height|min-inline-size|max-inline-size|min-block-size|max-block-size|font-size|gap|row-gap|column-gap|margin|padding|top|left|right|bottom|inset|text-indent|letter-spacing|word-spacing|border-radius|outline-offset|flex-basis|column-width|scroll-margin|scroll-padding|overflow-clip-margin|offset-distance|shape-margin|column-rule-width|border-block-width)$/.test(propName) && supportedLengthExpr(propValue)) return "yes";
  if (/^aspect-ratio:(?:auto|[+-]?(?:\d+\.?\d*|\.\d+)(?:\/[+-]?(?:\d+\.?\d*|\.\d+))?)$/.test(flat)) return "yes";
  if (cssWideYes(flat) === "yes" || plainSupportYes(flat)) return "yes";
  const known = knownSupportState(spaced);
  if (known) return known;
  if (flat.startsWith("selector(") && flat.endsWith(")")) return selectorSyntaxOk(flat.slice("selector(".length, -1)) ? "yes" : "maybe";
  if (/^--[a-z_][\w-]*:.+$/.test(flat)) return "yes";
  const colorProp = /^(color|background-color|border-color|outline-color|text-decoration-color|caret-color|accent-color|column-rule-color):(.+)$/.exec(flat);
  if (colorProp) {
    const prop = colorProp[1] ?? "color";
    const colorValue = colorProp[2] ?? "";
    const synthetic = `supports(color:${colorValue})`;
    const syntheticRaw = raw.replace(new RegExp(`(^supports\\(\\s*)${prop}(\\s*:)`, "i"), "$1color$2");
    if (supportsColor(synthetic) || SYSTEM_COLORS.has(colorValue)) return "yes";
    if (supportsModernColor(prop === "color" ? raw : syntheticRaw)) return "yes";
    const loosened = (prop === "color" ? raw : syntheticRaw).replace(/^supports\(\s*\(/i, "supports(").replace(/\)\s*\)$/, ")");
    if (loosened !== raw && supportsModernColor(loosened)) return "yes";
    if (/^(?:initial|inherit|unset|revert|revert-layer|currentcolor|transparent)$/.test(colorValue) || (prop === "outline-color" && colorValue === "invert")) return "yes";
    if (/^[a-z][a-z-]*$/.test(colorValue)) return "no";
    return "maybe";
  }
  return "maybe";
}

function liveSupportsState(test: string): "yes" | "no" | null {
  const cssApi = (globalThis as { CSS?: { supports?: (query: string) => boolean } }).CSS;
  if (typeof cssApi?.supports !== "function") return null;
  const trimmed = test.trim();
  const calls = namedFunctionCalls(trimmed, ["supports"]);
  if (calls.length !== 1 || !calls[0]) return null;
  const call = calls[0];
  if (trimmed.replace(/\s+/g, "").toLowerCase() !== `supports(${call.inner})`.replace(/\s+/g, "").toLowerCase()) return null;
  const query = unwrapMatchedParens(call.inner).trim();
  if (!query) return null;
  try {
    return cssApi.supports(query) ? "yes" : "no";
  } catch {
    return null;
  }
}

function supportsTestState(test: string): Cond {
  const live = liveSupportsState(test);
  if (live) return live;
  const trimmed = test.trim();
  const calls = namedFunctionCalls(trimmed, ["supports"]);
  if (calls.length !== 1 || !calls[0]) return "maybe";
  const call = calls[0];
  if (trimmed.replace(/\s+/g, "").toLowerCase() !== `supports(${call.inner})`.replace(/\s+/g, "").toLowerCase()) return "maybe";
  return supportsFeatureState(unwrapMatchedParens(call.inner), trimmed);
}

function ifConditionState(cond: string, defined?: Map<string, string>): Cond {
  const raw = unwrapMatchedParens(cond.trim());
  if (!raw) return "maybe";
  const ors = splitTopKeyword(raw, "or");
  if (ors) return combineBool(ors.map((part) => ifConditionState(part, defined)), "or");
  const ands = splitTopKeyword(raw, "and");
  if (ands) return combineBool(ands.map((part) => ifConditionState(part, defined)), "and");
  const notted = /^not\b([\s\S]+)$/i.exec(raw);
  if (notted) return flipState(ifConditionState((notted[1] ?? "").trim(), defined));
  if (/^else$/i.test(raw)) return "yes";
  const style = /^style\((--[A-Za-z_][\w-]*)\s*:\s*([\s\S]+)\)$/i.exec(raw);
  if (style) return definedMatches(defined, style[1] ?? "", style[2] ?? "") ? "yes" : "no";
  if (/^style\(/i.test(raw)) return "no";
  if (/^media\(/i.test(raw)) return mediaState(raw);
  if (/^supports\(/i.test(raw)) return supportsTestState(raw);
  return "maybe";
}

function ifCanHide(value: string, hidden: Set<string>, pred: (v: string) => boolean, seen?: Set<string>): boolean {
  const trimmed = value.trim();
  const calls = namedFunctionCalls(trimmed, ["if"]);
  if (calls.length !== 1) return false;
  const call = calls[0];
  if (!call) return false;
  if (trimmed.replace(/\s+/g, "").toLowerCase() !== `if(${call.inner})`.replace(/\s+/g, "").toLowerCase()) return false;
  const parts = splitTopSemi(call.inner)
    .map((part) => {
      let depth = 0;
      let quote = "";
      for (let i = 0; i < part.length; i += 1) {
        const ch = part[i] ?? "";
        const next = part[i + 1] ?? "";
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
        if (ch === ")" && depth > 0) depth -= 1;
        if (ch === ":" && depth === 0) return { cond: part.slice(0, i).trim(), value: part.slice(i + 1).trim() };
      }
      return null;
    })
    .filter((part): part is { cond: string; value: string } => Boolean(part?.value));
  if (!parts.length) return false;
  const defined = (hidden as HideVars).defined;
  for (const part of parts) {
    const state = ifConditionState(part.cond, defined);
    if (state === "yes") return valueCanHide(part.value, hidden, pred, seen);
    if (state === "no" || state === "dead") continue;
    break;
  }
  return parts.every((part) => valueCanHide(part.value, hidden, pred, seen));
}

/** shape() with no area hides the element. A curve or an arc stays. A triangle stays. */
function shapeHides(inner: string): boolean {
  const body = inner.trim().replace(/^(?:evenodd|nonzero)\s*,?\s*/i, "");
  if (/\b(?:curve|arc|smooth)\b/i.test(body)) return false;
  const tokens = body.match(/[a-zA-Z]+|[+-]?(?:\d*\.?\d+)(?:e[+-]?\d+)?(?:%|px|em|rem)?/gi);
  if (!tokens) return false;
  let i = 0;
  let cx = 0;
  let cy = 0;
  let unit = "";
  let bareNonZero = false;
  const pts: [number, number][] = [];
  const acceptUnit = (n: number, next: string): boolean => {
    if (!next) {
      if (n !== 0) bareNonZero = true;
      return !(bareNonZero && unit);
    }
    if (bareNonZero) return false;
    if (!unit) unit = next;
    return next === unit;
  };
  const num = (): { n: number; unit: string } | null => {
    const token = tokens[i];
    if (token == null || /^[a-z]/i.test(token)) return null;
    i += 1;
    const m = /^([+-]?(?:\d*\.?\d+)(?:e[+-]?\d+)?)(%|px|em|rem)?$/i.exec(token);
    if (!m?.[1] || m[1] === "." || m[1] === "+" || m[1] === "-") return null;
    const n = Number(m[1]);
    if (!Number.isFinite(n)) return null;
    return { n, unit: (m[2] ?? "").toLowerCase() };
  };
  const takePair = (rel: boolean): boolean => {
    const x = num();
    const y = num();
    if (!x || !y || !acceptUnit(x.n, x.unit) || !acceptUnit(y.n, y.unit)) return false;
    cx = rel ? cx + x.n : x.n;
    cy = rel ? cy + y.n : y.n;
    pts.push([cx, cy]);
    return true;
  };
  while (i < tokens.length) {
    const word = (tokens[i] ?? "").toLowerCase();
    if (!/^[a-z]/i.test(word)) return false;
    i += 1;
    if (word === "close") continue;
    if (word === "from" || word === "move" || word === "line") {
      const rel = word !== "from" && (tokens[i] ?? "").toLowerCase() === "by";
      const abs = (tokens[i] ?? "").toLowerCase() === "to";
      if (word !== "from") {
        if (!rel && !abs) return false;
        i += 1;
      }
      if (!takePair(rel)) return false;
      continue;
    }
    if (word === "hline" || word === "vline") {
      const rel = (tokens[i] ?? "").toLowerCase() === "by";
      const abs = (tokens[i] ?? "").toLowerCase() === "to";
      if (!rel && !abs) return false;
      i += 1;
      const axis = num();
      if (!axis || !acceptUnit(axis.n, axis.unit)) return false;
      if (word === "hline") cx = rel ? cx + axis.n : axis.n;
      else cy = rel ? cy + axis.n : axis.n;
      pts.push([cx, cy]);
      continue;
    }
    return false;
  }
  if (pts.length < 3) return true;
  let area = 0;
  for (let p = 0; p < pts.length; p += 1) {
    const next = pts[(p + 1) % pts.length] ?? pts[0];
    const point = pts[p];
    if (!point || !next) return false;
    area += point[0] * next[1] - next[0] * point[1];
  }
  return area === 0;
}

/** inset(), a zero circle, or a shape with no area covers the element. A class can still clip. A partial inset stays. */
function splitTopWords(value: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let depth = 0;
  let quote = "";
  const flush = () => {
    if (current.trim()) tokens.push(current.trim());
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
    if (ch === "(") depth += 1;
    else if (ch === ")" && depth > 0) depth -= 1;
    if (depth === 0 && /\s/.test(ch)) {
      flush();
      continue;
    }
    current += ch;
  }
  flush();
  return tokens;
}

function clipHides(value: string, hidden: Set<string>): boolean {
  const found = namedFunctionCalls(value, ["ellipse", "circle", "polygon", "inset", "xywh", "rect", "path", "shape"]);
  if (
    found.some((call) => {
      if (call.name === "circle") {
        const radius = (call.inner.trim().match(/^[^\s]+/)?.[0] ?? "").trim();
        return Boolean(radius) && valueCanHide(radius, hidden, hidesAsZero);
      }
      if (call.name === "xywh") {
        const parts = splitArgs(call.inner)
          .flatMap((part) => part.trim().split(/\s+/))
          .filter(Boolean);
        const width = parts[2] ?? "";
        const height = parts[3] ?? "";
        return (Boolean(width) && valueCanHide(width, hidden, hidesAsZero)) || (Boolean(height) && valueCanHide(height, hidden, hidesAsZero));
      }
      if (call.name === "rect") return rectHides(call.inner);
      if (call.name === "polygon") return polygonAreaZero(call.inner);
      if (call.name === "path") return pathHides(call.inner);
      if (call.name === "shape") return shapeHides(call.inner);
      if (call.name === "ellipse") {
        const parts = call.inner.trim().split(/\s+/);
        return parts.slice(0, 2).some((part) => valueCanHide(part, hidden, hidesAsZero));
      }
      const rawTokens = splitArgs(call.inner).flatMap((part) => splitTopWords(part));
      const roundAt = rawTokens.findIndex((token) => /^round$/i.test(token));
      const raw = roundAt >= 0 ? rawTokens.slice(0, roundAt) : rawTokens;
      const sides = raw.length <= 1 ? [raw[0] ?? "", raw[0] ?? "", raw[0] ?? "", raw[0] ?? ""] : raw.length === 2 ? [raw[0] ?? "", raw[1] ?? "", raw[0] ?? "", raw[1] ?? ""] : raw.length === 3 ? [raw[0] ?? "", raw[1] ?? "", raw[2] ?? "", raw[1] ?? ""] : [raw[0] ?? "", raw[1] ?? "", raw[2] ?? "", raw[3] ?? ""];
      const parsed = sides.map((side) => insetSide(side, hidden));
      const top = parsed[0];
      const right = parsed[1];
      const bottom = parsed[2];
      const left = parsed[3];
      if (!top || !right || !bottom || !left) return false;
      return insetPairCovers(top, bottom) || insetPairCovers(left, right);
    })
  ) {
    return true;
  }
  const clips = (hidden as HideVars).clips;
  if (!clips) return false;
  return varCalls(value).some((call) => clips.has(call.name) || (Boolean(call.fallback) && clipHides(call.fallback, hidden)));
}

function edgeAmount(token: string): { n: number; unit: string } | null {
  const m = /^([+-]?(?:\d*\.?\d+)(?:e[+-]?\d+)?)(%|px|em|rem)?$/i.exec(token.trim());
  if (!m?.[1] || m[1] === "." || m[1] === "+" || m[1] === "-") return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return { n, unit: (m[2] ?? "").toLowerCase() };
}

/** rect() with no width or no height is a zero box. A real rectangle stays. */
function rectHides(inner: string): boolean {
  const parts = splitArgs(inner)
    .flatMap((part) => part.trim().split(/\s+/))
    .filter(Boolean);
  if (parts.length < 4) return false;
  const edges = parts.slice(0, 4).map((part) => edgeAmount(part));
  if (edges.some((edge) => !edge)) return false;
  const top = edges[0];
  const right = edges[1];
  const bottom = edges[2];
  const left = edges[3];
  if (!top || !right || !bottom || !left) return false;
  const unit = top.unit;
  if (right.unit !== unit || bottom.unit !== unit || left.unit !== unit) return false;
  return right.n - left.n === 0 || bottom.n - top.n === 0;
}

/** An empty path, or a path that only moves, has no area. A curve stays. A triangle stays. */
function pathHides(inner: string): boolean {
  const quoted = /(['"])([\s\S]*)\1/.exec(inner.trim());
  if (!quoted) return inner.trim() === "" || /^(?:evenodd|nonzero)$/i.test(inner.trim());
  const d = (quoted[2] ?? "").replace(/,/g, " ").trim();
  if (!d) return true;
  if (/[cqast]/i.test(d)) return false;
  const tokens = d.match(/[a-zA-Z]|[+-]?(?:\d*\.?\d+)(?:e[+-]?\d+)?/gi);
  if (!tokens) return false;
  let i = 0;
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  const pts: [number, number][] = [];
  const num = () => {
    const token = tokens[i];
    if (token == null || /[a-z]/i.test(token)) return null;
    i += 1;
    const n = Number(token);
    return Number.isFinite(n) ? n : null;
  };
  while (i < tokens.length) {
    const cmd = tokens[i];
    if (!cmd || !/[a-z]/i.test(cmd)) return false;
    i += 1;
    const rel = cmd === cmd.toLowerCase();
    const op = cmd.toLowerCase();
    if (op === "z") {
      cx = sx;
      cy = sy;
      continue;
    }
    if (op !== "m" && op !== "l" && op !== "h" && op !== "v") return false;
    let pair = 0;
    while (i < tokens.length && !/[a-z]/i.test(tokens[i] ?? "")) {
      if (op === "h") {
        const x = num();
        if (x == null) return false;
        cx = rel ? cx + x : x;
      } else if (op === "v") {
        const y = num();
        if (y == null) return false;
        cy = rel ? cy + y : y;
      } else {
        const x = num();
        const y = num();
        if (x == null || y == null) return false;
        cx = rel ? cx + x : x;
        cy = rel ? cy + y : y;
        if (op === "m" && pair === 0) {
          sx = cx;
          sy = cy;
        }
      }
      pts.push([cx, cy]);
      pair += 1;
    }
    if (pair === 0) return false;
  }
  if (pts.length < 3) return true;
  let area = 0;
  for (let p = 0; p < pts.length; p += 1) {
    const next = pts[(p + 1) % pts.length] ?? pts[0];
    const point = pts[p];
    if (!point || !next) return false;
    area += point[0] * next[1] - next[0] * point[1];
  }
  return area === 0;
}

type HideVars = Set<string> & { clips?: Set<string>; masks?: Set<string>; defined?: Map<string, string>; perspectives?: number[]; htmlPaintZero?: boolean; bodyPaintZero?: boolean; contentsPaintZero?: boolean };

function lengthPx(token: string): number | null {
  const compact = token.replace(/!important/gi, "").replace(/\s+/g, "");
  if (!compact) return null;
  const parsed = parseMathSum(compact, 0);
  if (!parsed || parsed.i !== compact.length || !Number.isFinite(parsed.n)) return null;
  const units = Object.entries(parsed.u).filter(([, exp]) => exp);
  if (units.length !== 1 || units[0]?.[1] !== 1) return null;
  const unit = units[0]?.[0] ?? "";
  const n = parsed.n;
  if (unit === "px") return n;
  if (unit === "pt") return (n * 96) / 72;
  if (unit === "pc") return n * 16;
  if (unit === "in") return n * 96;
  if (unit === "cm") return (n * 96) / 2.54;
  if (unit === "mm") return (n * 96) / 25.4;
  if (unit === "q") return (n * 96) / 101.6;
  return null;
}

function lengthUnit(token: string): string | null {
  const compact = token.replace(/!important/gi, "").replace(/\s+/g, "");
  if (!compact) return null;
  const parsed = parseMathSum(compact, 0);
  if (!parsed || parsed.i !== compact.length || !Number.isFinite(parsed.n)) return null;
  const units = Object.entries(parsed.u).filter(([, exp]) => exp);
  if (units.length !== 1 || units[0]?.[1] !== 1) return null;
  return units[0]?.[0] ?? null;
}

function angleDegrees(token: string, hidden: Set<string>, seen?: Set<string>): number | null {
  const compact = token.replace(/!important/gi, "").replace(/\s+/g, "");
  if (!compact) return null;
  const parsed = parseMathSum(compact, 0);
  if (parsed && parsed.i === compact.length && Number.isFinite(parsed.n)) {
    const units = Object.entries(parsed.u).filter(([, exp]) => exp);
    if (units.length === 1 && units[0]?.[1] === 1) {
      const unit = units[0]?.[0] ?? "";
      if (unit === "deg") return parsed.n;
      if (unit === "turn") return parsed.n * 360;
      if (unit === "grad") return parsed.n * 0.9;
      if (unit === "rad") return (parsed.n * 180) / Math.PI;
      if (unit === "pi") return parsed.n * 180;
    }
  }
  const trail = seen ?? new Set<string>();
  const defined = (hidden as HideVars).defined;
  for (const call of varCalls(token)) {
    const raw = defined?.get(call.name);
    if (raw && !trail.has(call.name)) {
      const next = new Set(trail);
      next.add(call.name);
      const deg = angleDegrees(raw, hidden, next);
      if (deg != null) return deg;
    }
    if (call.fallback) {
      const deg = angleDegrees(call.fallback, hidden, trail);
      if (deg != null) return deg;
    }
  }
  return null;
}

function nearDeg(n: number, target: number): boolean {
  const m = ((n % 360) + 360) % 360;
  const d = Math.abs(m - target);
  return d < 1e-6 || Math.abs(d - 360) < 1e-6;
}

function angleIsEdge(token: string, hidden: Set<string>): boolean {
  const deg = angleDegrees(token, hidden);
  return deg != null && (nearDeg(deg, 90) || nearDeg(deg, 270));
}

function angleIsBack(token: string, hidden: Set<string>): boolean {
  const deg = angleDegrees(token, hidden);
  return deg != null && nearDeg(deg, 180);
}

function tanOf(token: string, hidden: Set<string>): number | null {
  const deg = angleDegrees(token, hidden);
  if (deg == null) return null;
  const rad = (deg * Math.PI) / 180;
  const c = Math.cos(rad);
  if (Math.abs(c) < 1e-9) return Number.POSITIVE_INFINITY;
  return Math.sin(rad) / c;
}

function skewCallHides(inner: string, hidden: Set<string>): boolean {
  const angles = splitArgs(inner).map((part) => part.trim()).filter(Boolean);
  if (angles.some((angle) => angleIsEdge(angle, hidden))) return true;
  if (angles.length < 2) return false;
  const left = tanOf(angles[0] ?? "", hidden);
  const right = tanOf(angles[1] ?? "", hidden);
  if (left == null || right == null) return false;
  if (!Number.isFinite(left) || !Number.isFinite(right)) return true;
  return Math.abs(1 - left * right) < 1e-6;
}

function axisArgsHide(args: string[], hidden: Set<string>, edge: boolean): boolean {
  const angle = args[3] ?? "";
  if (edge ? !angleIsEdge(angle, hidden) : !angleIsBack(angle, hidden)) return false;
  const x = coeffOf(args[0] ?? "", hidden);
  const y = coeffOf(args[1] ?? "", hidden);
  const z = coeffOf(args[2] ?? "", hidden);
  if (x == null || y == null || z == null) return false;
  return z === 0 && (x !== 0 || y !== 0);
}

function transformAxisHides(value: string, hidden: Set<string>, seen?: Set<string>): boolean {
  const found = namedFunctionCalls(value, ["rotate3d", "rotatex", "rotatey", "rotatez", "rotate", "skewx", "skewy", "skew"]);
  for (const call of found) {
    const args = splitArgs(call.inner);
    if ((call.name === "rotatex" || call.name === "rotatey") && args.some((arg) => angleIsEdge(arg, hidden))) return true;
    if (call.name === "rotate3d" && axisArgsHide(args, hidden, true)) return true;
    if ((call.name === "skewx" || call.name === "skewy" || call.name === "skew") && skewCallHides(call.inner, hidden)) return true;
  }
  const trail = seen ?? new Set<string>();
  const defined = (hidden as HideVars).defined;
  for (const call of varCalls(value)) {
    const raw = defined?.get(call.name);
    if (raw && !trail.has(call.name)) {
      const next = new Set(trail);
      next.add(call.name);
      if (transformAxisHides(raw, hidden, next)) return true;
    }
    if (call.fallback && transformAxisHides(call.fallback, hidden, trail)) return true;
  }
  return false;
}

function transformBackTurn(value: string, hidden: Set<string>, seen?: Set<string>): boolean {
  const found = namedFunctionCalls(value, ["rotate3d", "rotatex", "rotatey"]);
  for (const call of found) {
    const args = splitArgs(call.inner);
    if ((call.name === "rotatex" || call.name === "rotatey") && args.some((arg) => angleIsBack(arg, hidden))) return true;
    if (call.name === "rotate3d" && axisArgsHide(args, hidden, false)) return true;
  }
  const trail = seen ?? new Set<string>();
  const defined = (hidden as HideVars).defined;
  for (const call of varCalls(value)) {
    const raw = defined?.get(call.name);
    if (raw && !trail.has(call.name)) {
      const next = new Set(trail);
      next.add(call.name);
      if (transformBackTurn(raw, hidden, next)) return true;
    }
    if (call.fallback && transformBackTurn(call.fallback, hidden, trail)) return true;
  }
  return false;
}

function rotatePropertyParts(value: string): string[] {
  return splitTopWords(value.replace(/!important/gi, "")).filter(Boolean);
}

function rotatePropertyHides(value: string, hidden: Set<string>, seen?: Set<string>): boolean {
  const parts = rotatePropertyParts(value);
  if (parts.length === 2) {
    const axis = (parts[0] ?? "").toLowerCase();
    if ((axis === "x" || axis === "y") && angleIsEdge(parts[1] ?? "", hidden)) return true;
  }
  if (parts.length === 4 && axisArgsHide(parts, hidden, true)) return true;
  return rotateValueFollows(value, hidden, seen, rotatePropertyHides);
}

function rotatePropertyBack(value: string, hidden: Set<string>, seen?: Set<string>): boolean {
  const parts = rotatePropertyParts(value);
  if (parts.length === 2) {
    const axis = (parts[0] ?? "").toLowerCase();
    if ((axis === "x" || axis === "y") && angleIsBack(parts[1] ?? "", hidden)) return true;
  }
  if (parts.length === 4 && axisArgsHide(parts, hidden, false)) return true;
  return rotateValueFollows(value, hidden, seen, rotatePropertyBack);
}

function rotateValueFollows(value: string, hidden: Set<string>, seen: Set<string> | undefined, again: (value: string, hidden: Set<string>, seen?: Set<string>) => boolean): boolean {
  const trail = seen ?? new Set<string>();
  const defined = (hidden as HideVars).defined;
  for (const call of varCalls(value)) {
    const raw = defined?.get(call.name);
    if (raw && !trail.has(call.name)) {
      const next = new Set(trail);
      next.add(call.name);
      if (again(raw, hidden, next)) return true;
    }
    if (call.fallback && again(call.fallback, hidden, trail)) return true;
  }
  return false;
}

function translateZHides(value: string, hidden: Set<string>): boolean {
  const distances = (hidden as HideVars).perspectives ?? [];
  if (!distances.length) return false;
  const found = namedFunctionCalls(value, ["translate3d", "translatez"]);
  return found.some((call) => {
    const args = splitArgs(call.inner);
    const token = call.name === "translatez" ? (args[0] ?? "") : (args[2] ?? "");
    const z = lengthPx(token);
    if (z == null) return false;
    return distances.some((d) => {
      if (d === 0) return true;
      const scale = Math.abs(d / (d - z));
      return Number.isFinite(scale) && scale < 0.2;
    });
  });
}

/** perspective() before a Z shift is the same flatten as a tiny perspective on the desk. The other order stays. */
function perspectiveTranslateHides(value: string, hidden: Set<string>, seen?: Set<string>): boolean {
  const found = namedFunctionCalls(value, ["perspective", "translatez", "translate3d", "translate"]);
  let distance: number | null = null;
  for (const call of found) {
    if (call.name === "perspective") {
      const px = lengthPx((splitArgs(call.inner)[0] ?? "").trim());
      distance = px != null && px >= 0 ? px : null;
      continue;
    }
    if (distance == null) continue;
    const args = splitArgs(call.inner);
    let token = "";
    if (call.name === "translatez") token = args[0] ?? "";
    else if (call.name === "translate3d") token = args[2] ?? "";
    else {
      const words = args.flatMap((part) => splitTopWords(part));
      if (words.length < 3) continue;
      token = words[2] ?? "";
    }
    const z = lengthPx(token.trim());
    if (z == null) continue;
    if (distance === 0) return true;
    const scale = Math.abs(distance / (distance - z));
    if (Number.isFinite(scale) && scale < 0.2) return true;
  }
  const trail = seen ?? new Set<string>();
  const defined = (hidden as HideVars).defined;
  for (const call of varCalls(value)) {
    const raw = defined?.get(call.name);
    if (raw && !trail.has(call.name)) {
      const next = new Set(trail);
      next.add(call.name);
      if (perspectiveTranslateHides(raw, hidden, next)) return true;
    }
    if (call.fallback && perspectiveTranslateHides(call.fallback, hidden, trail)) return true;
  }
  return false;
}

function blurHides(inner: string, hidden: Set<string>, seen?: Set<string>): boolean {
  const arg = (splitArgs(inner)[0] ?? inner).trim();
  const px = lengthPx(arg);
  if (px != null) return Math.abs(px) >= (lengthUnit(arg) === "q" ? 16 : 8);
  const compact = arg.replace(/!important/gi, "").replace(/\s+/g, "");
  const parsed = parseMathSum(compact, 0);
  if (parsed && parsed.i === compact.length && Number.isFinite(parsed.n)) {
    const units = Object.entries(parsed.u).filter(([, exp]) => exp);
    if (units.length === 1 && units[0]?.[1] === 1) {
      const unit = units[0]?.[0] ?? "";
      const n = Math.abs(parsed.n);
      if (unit === "em" || unit === "rem") return n >= 0.5;
      if (unit === "%" || /^(?:[dls])?v(?:w|h|i|b|min|max)$/.test(unit)) return n >= 2;
    }
  }
  const trail = seen ?? new Set<string>();
  const defined = (hidden as HideVars).defined;
  for (const call of varCalls(arg)) {
    const raw = defined?.get(call.name);
    if (raw && !trail.has(call.name)) {
      const next = new Set(trail);
      next.add(call.name);
      if (blurHides(raw, hidden, next)) return true;
    }
    if (call.fallback && blurHides(call.fallback, hidden, trail)) return true;
  }
  return false;
}

const SHIFT_PROP = new Set([
  "top",
  "right",
  "bottom",
  "left",
  "inset",
  "inset-block",
  "inset-inline",
  "inset-block-start",
  "inset-block-end",
  "inset-inline-start",
  "inset-inline-end",
  "margin",
  "margin-block",
  "margin-inline",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "margin-block-start",
  "margin-block-end",
  "margin-inline-start",
  "margin-inline-end",
]);

function shiftValueCovers(value: string, hidden: Set<string>): boolean {
  return splitTopWords(value.replace(/!important/gi, "")).some((token) => token.toLowerCase() !== "auto" && shiftTokenCovers(token, hidden));
}

/** A large absolute indent moves the only line off the page, and the page does not scroll back to it. A few pixels stay. A percentage stays unless nowrap clips it. */
function indentPxHides(value: string, hidden: Set<string>, seen?: Set<string>): boolean {
  const px = lengthPx(value);
  if (px != null) return Math.abs(px) >= 1000;
  const trail = seen ?? new Set<string>();
  const defined = (hidden as HideVars).defined;
  for (const call of varCalls(value)) {
    const raw = defined?.get(call.name);
    if (raw && !trail.has(call.name)) {
      const next = new Set(trail);
      next.add(call.name);
      if (indentPxHides(raw, hidden, next)) return true;
    }
    if (call.fallback && indentPxHides(call.fallback, hidden, trail)) return true;
  }
  return false;
}

function declarationHidesDesk(piece: string, hidden: Set<string>): boolean {
  const idx = piece.indexOf(":");
  if (idx <= 0) return false;
  const prop = piece.slice(0, idx).trim().toLowerCase().replace(/\s+/g, "");
  const val = piece.slice(idx + 1).trim();
  if (!prop || !val) return false;
  if (wholeFunction(val, "if")) return ifCanHide(val, hidden, (branch) => declarationHidesDesk(`${prop}: ${branch}`, hidden));
  if (prop === "display" || prop === "pointer-events") return valueCanHide(val, hidden, (v) => /\bnone\b/i.test(v));
  if (prop === "visibility") return valueCanHide(val, hidden, (v) => /\b(?:hidden|collapse)\b/i.test(v));
  if (prop === "content-visibility") return valueCanHide(val, hidden, (v) => /\bhidden\b/i.test(v));
  if (prop === "opacity") return valueCanHide(val, hidden, clampsToZero);
  if (prop === "filter" || prop === "-webkit-filter") {
    if (functionCallsNamed(val, ["opacity", "brightness", "contrast"]).some((inner) => valueCanHide(inner, hidden, clampsToZero))) return true;
    return functionCallsNamed(val, ["blur"]).some((inner) => blurHides(inner, hidden));
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
    return matrixFlattens(val, hidden) || matrixShifts(val, hidden) || translateHides(val, hidden) || transformAxisHides(val, hidden) || translateZHides(val, hidden) || perspectiveTranslateHides(val, hidden);
  }
  if (prop === "rotate") return rotatePropertyHides(val, hidden);
  if (prop === "zoom") return valueCanHide(val, hidden, hidesAsZero);
  if (prop === "font-size") return valueCanHide(val, hidden, hidesAsZero);
  if (prop === "text-indent") return indentPxHides(val, hidden);
  if (prop === "clip-path" || prop === "-webkit-clip-path") return clipHides(val, hidden);
  if (prop === "clip") return namedFunctionCalls(val, ["rect"]).some((call) => rectHides(call.inner));
  if (prop === "mask" || prop === "mask-image" || prop === "-webkit-mask" || prop === "-webkit-mask-image") return maskHides(val, hidden);
  if (prop === "translate") {
    const args = splitTopWords(val.replace(/!important/gi, ""));
    return args.slice(0, 2).some((arg) => shiftTokenCovers(arg, hidden));
  }
  if (SHIFT_PROP.has(prop)) return shiftValueCovers(val, hidden);
  if (prop === "contain") {
    const words = val.toLowerCase().replace(/!important/gi, "").split(/[\s,]+/).filter(Boolean);
    return words.includes("strict") || (words.includes("size") && words.includes("paint"));
  }
  if (prop === "offset-path") return val.replace(/!important/gi, "").trim().toLowerCase() !== "none";
  if (prop === "offset") {
    const tight = val.replace(/!important/gi, "").trim().toLowerCase();
    if (tight === "none" || tight === "auto") return false;
    return /\b(?:path|ray|url|shape|border-box|content-box|padding-box|fill-box|stroke-box|view-box|margin-box)\b/.test(tight);
  }
  return false;
}

function parenDepthAt(value: string, index: number): number {
  let depth = 0;
  let quote = "";
  for (let i = 0; i < index && i < value.length; i += 1) {
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
    else if (ch === ")" && depth > 0) depth -= 1;
  }
  return depth;
}

function collectHideVars(css: string): HideVars {
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
    if (parenDepthAt(css, hit.index ?? 0) > 0) continue;
    raw.set(`--${hit[1]}`, (hit[2] ?? "").trim());
  }
  const hidden: HideVars = new Set();
  hidden.defined = raw;
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
  const clips = new Set<string>();
  hidden.clips = clips;
  let clipChanged = true;
  while (clipChanged) {
    clipChanged = false;
    for (const [name, value] of raw) {
      if (clips.has(name)) continue;
      if (clipHides(value, hidden)) {
        clips.add(name);
        clipChanged = true;
      }
    }
  }
  const masks = new Set<string>();
  hidden.masks = masks;
  let maskChanged = true;
  while (maskChanged) {
    maskChanged = false;
    for (const [name, value] of raw) {
      if (masks.has(name)) continue;
      if (maskHides(value, hidden)) {
        masks.add(name);
        maskChanged = true;
      }
    }
  }
  return hidden;
}

const BOX_SIZE = new Set(["height", "width", "max-height", "max-width", "block-size", "inline-size", "max-block-size", "max-inline-size"]);

type Sib = { index: number; count: number };
const HTML_SIB: Sib = { index: 1, count: 1 };
const BODY_SIB: Sib = { index: 2, count: 2 };
let activeSib: Sib | null = null;

function withSib<T>(sib: Sib, fn: () => T): T {
  const prev = activeSib;
  activeSib = sib;
  try {
    return fn();
  } finally {
    activeSib = prev;
  }
}

function declarationHidesFor(piece: string, hidden: Set<string>, profiles: Sib[]): boolean {
  if (declarationHidesDesk(piece, hidden)) return true;
  return profiles.some((sib) => withSib(sib, () => declarationHidesDesk(piece, hidden)));
}

function isBoxClip(part: string): boolean {
  const idx = part.indexOf(":");
  if (idx <= 0) return false;
  const prop = part.slice(0, idx).trim().toLowerCase().replace(/\s+/g, "");
  return (prop === "overflow" || prop === "overflow-x" || prop === "overflow-y") && /\b(?:hidden|clip)\b/i.test(part.slice(idx + 1));
}

function isPaintContain(part: string): boolean {
  const piece = pieceProp(part);
  if (!piece || piece.prop !== "contain") return false;
  const words = piece.val.toLowerCase().replace(/!important/gi, "").split(/[\s,]+/).filter(Boolean);
  return words.includes("paint") || words.includes("content") || words.includes("strict");
}

function isBoxZero(part: string, hidden: Set<string>): boolean {
  const idx = part.indexOf(":");
  if (idx <= 0) return false;
  const prop = part.slice(0, idx).trim().toLowerCase().replace(/\s+/g, "");
  return BOX_SIZE.has(prop) && valueCanHide(part.slice(idx + 1), hidden, hidesAsZero);
}

/** A zero width or height plus a clip overflow hides the desk. A full-height scroll stays. A class may still collapse. */
function boxCollapses(parts: string[], hidden: Set<string>): boolean {
  return parts.some((part) => isBoxClip(part)) && parts.some((part) => isBoxZero(part, hidden));
}

function boxCollapsesFor(parts: string[], hidden: Set<string>, profiles: Sib[]): boolean {
  if (boxCollapses(parts, hidden)) return true;
  return profiles.some((sib) => withSib(sib, () => boxCollapses(parts, hidden)));
}

function isBoxZeroFor(part: string, hidden: Set<string>, profiles: Sib[]): boolean {
  if (isBoxZero(part, hidden)) return true;
  return profiles.some((sib) => withSib(sib, () => isBoxZero(part, hidden)));
}

function paintCollapsesFor(parts: string[], hidden: Set<string>, profiles: Sib[]): boolean {
  if (!parts.some((part) => isPaintContain(part))) return false;
  return parts.some((part) => isBoxZeroFor(part, hidden, profiles));
}

function elementPaintPair(profiles: Sib[], hidden: Set<string>): boolean {
  const flags = hidden as HideVars;
  if (profiles.length === 0 && flags.contentsPaintZero) return true;
  return profiles.some((profile) => (profile === HTML_SIB && flags.htmlPaintZero) || (profile === BODY_SIB && flags.bodyPaintZero));
}

function paintPieceDrops(part: string, hidden: Set<string>, profiles: Sib[], paint: boolean): boolean {
  return paint && (isPaintContain(part) || isBoxZeroFor(part, hidden, profiles));
}

function pieceProp(part: string): { prop: string; val: string } | null {
  const idx = part.indexOf(":");
  if (idx <= 0) return null;
  const prop = part.slice(0, idx).trim().toLowerCase().replace(/\s+/g, "");
  const val = part.slice(idx + 1).trim();
  if (!prop || !val) return null;
  return { prop, val };
}

function isBackHidden(part: string): boolean {
  const piece = pieceProp(part);
  if (!piece) return false;
  return (piece.prop === "backface-visibility" || piece.prop === "-webkit-backface-visibility") && /\bhidden\b/i.test(piece.val);
}

function isBackTurn(part: string, hidden: Set<string>): boolean {
  const piece = pieceProp(part);
  if (!piece) return false;
  if (piece.prop === "rotate") return rotatePropertyBack(piece.val, hidden);
  if (piece.prop === "transform" || piece.prop === "-webkit-transform") return transformBackTurn(piece.val, hidden);
  return false;
}

function isNowrap(part: string): boolean {
  const piece = pieceProp(part);
  if (!piece) return false;
  return (piece.prop === "white-space" || piece.prop === "text-wrap" || piece.prop === "text-wrap-mode") && /\bnowrap\b/i.test(piece.val);
}

function indentCovers(value: string, hidden: Set<string>): boolean {
  if (shiftValueCovers(value, hidden)) return true;
  const px = lengthPx(value);
  return px != null && Math.abs(px) >= 1000;
}

function isIndentCover(part: string, hidden: Set<string>): boolean {
  const piece = pieceProp(part);
  return Boolean(piece && piece.prop === "text-indent" && indentCovers(piece.val, hidden));
}

/** A back-face flip, or a full indent on one line, hides the desk only as a pair. Either one alone stays. */
function pairedHide(parts: string[], hidden: Set<string>): (part: string) => boolean {
  const back = parts.some((part) => isBackHidden(part)) && parts.some((part) => isBackTurn(part, hidden));
  const indent = parts.some((part) => isNowrap(part)) && parts.some((part) => isBoxClip(part)) && parts.some((part) => isIndentCover(part, hidden));
  return (part) => (back && (isBackHidden(part) || isBackTurn(part, hidden))) || (indent && isIndentCover(part, hidden));
}

function scrubHideBody(body: string, hidden: Set<string>, anims: Set<string> = new Set(), profiles: Sib[] = [HTML_SIB, BODY_SIB]) {
  const parts = splitCssDeclarations(body)
    .map((part) => part.trim())
    .filter(Boolean);
  const flat = boxCollapsesFor(parts, hidden, profiles);
  const paint = paintCollapsesFor(parts, hidden, profiles) || elementPaintPair(profiles, hidden);
  const pair = pairedHide(parts, hidden);
  return parts
    .filter((part) => part && !declarationHidesFor(part, hidden, profiles) && !declarationUsesHidingAnim(part, anims) && !pair(part) && !(flat && (isBoxClip(part) || isBoxZeroFor(part, hidden, profiles))) && !paintPieceDrops(part, hidden, profiles, paint))
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
    const minus: boolean = s[left.i] === "-";
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

/** pi times one radian is still that many turns of pi. Two units that are not that pair stay unread. */
function foldPiRad(qty: MathQty): MathQty {
  if (qty.u.pi !== 1 || qty.u.rad !== 1) return qty;
  const u: Record<string, number> = {};
  for (const [key, exp] of Object.entries(qty.u)) {
    if (key === "rad" || !exp) continue;
    u[key] = exp;
  }
  return { n: qty.n, u, i: qty.i };
}

function parseMathMul(s: string, i: number): MathQty | null {
  let left = parseMathUnary(s, i);
  if (!left) return null;
  while (s[left.i] === "*" || s[left.i] === "/") {
    const divide = s[left.i] === "/";
    const right = parseMathUnary(s, left.i + 1);
    if (!right) return null;
    if (divide && right.n === 0) return null;
    left = foldPiRad({
      n: divide ? left.n / right.n : left.n * right.n,
      u: combineUnits(left.u, right.u, divide ? -1 : 1),
      i: right.i,
    });
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
  if (unit && !/^(?:px|em|rem|pt|pc|in|cm|mm|q|vh|vw|vmin|vmax|vi|vb|dvh|svh|lvh|dvw|svw|lvw|dvi|dvb|svi|svb|lvi|lvb|dvmin|dvmax|svmin|svmax|lvmin|lvmax|cqi|cqb|cqw|cqh|cqmin|cqmax|deg|turn|rad|grad|s|ms|fr|ch|ex|cap|rcap|ic|ric|lh|rlh|rex|rch|%)$/.test(unit)) return null;
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
  if (!unit || unit === "rad") {
    const half = n / (Math.PI / 2);
    if (n !== 0 && !nearInt(half)) return null;
    const k = n === 0 ? 0 : ((Math.round(half) % 4) + 4) % 4;
    if (k === 0) return { sin: 0, cos: 1 };
    if (k === 1) return { sin: 1, cos: 0 };
    if (k === 2) return { sin: 0, cos: -1 };
    return { sin: -1, cos: 0 };
  }
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
  const names = ["sibling-index", "sibling-count", "clamp", "hypot", "round", "atan2", "sqrt", "sign", "calc", "asin", "acos", "atan", "min", "max", "mod", "pow", "log", "abs", "rem", "sin", "cos", "tan", "exp", "progress"];
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
    if ((name === "sibling-index" || name === "sibling-count") && s[cursor] === ")") {
      if (activeSib) {
        const n = name === "sibling-index" ? activeSib.index : activeSib.count;
        return { n, u: blankUnits(), i: cursor + 1 };
      }
      return { n: 1, u: { [name]: 1 }, i: cursor + 1 };
    }
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
    if (name === "min" && args.some((arg) => arg.n === 0 && Object.keys(arg.u).length === 0) && args.every((arg) => arg.n >= 0)) {
      return { n: 0, u: blankUnits(), i: cursor };
    }
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
    } else if (name === "progress") {
      if (args.length !== 3) return null;
      const value = args[0];
      const start = args[1];
      const end = args[2];
      if (!value || !start || !end || [value, start, end].some((arg) => !Number.isFinite(arg.n))) return null;
      const span = end.n - start.n;
      if (span === 0) return { n: Number.NaN, u: blankUnits(), i: cursor };
      return { n: (value.n - start.n) / span, u: blankUnits(), i: cursor };
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

function matrixParts(inner: string): string[] {
  const comma = splitArgs(inner).map((part) => part.trim()).filter(Boolean);
  if (comma.length > 1) return comma;
  return splitTopWords(inner);
}

/** A matrix translation of a full page is the same hide as translate(). A few pixels stay. */
function matrixShifts(value: string, hidden: Set<string>): boolean {
  const found = namedFunctionCalls(value, ["matrix3d", "matrix"]);
  return found.some((call) => {
    const nums = matrixParts(call.inner);
    const tx = call.name === "matrix" ? (nums[4] ?? "") : (nums[12] ?? "");
    const ty = call.name === "matrix" ? (nums[5] ?? "") : (nums[13] ?? "");
    return shiftTokenCovers(tx, hidden) || shiftTokenCovers(ty, hidden);
  });
}

function shiftAxisCovers(value: string): boolean {
  const t = value.replace(/!important/gi, "").replace(/\s+/g, "");
  if (!t) return false;
  const parsed = parseMathSum(t, 0);
  if (!parsed || parsed.i !== t.length || !Number.isFinite(parsed.n)) return false;
  const units = Object.entries(parsed.u).filter(([, exp]) => exp);
  if (units.length !== 1 || units[0]?.[1] !== 1) return false;
  const unit = units[0]?.[0] ?? "";
  if (unit !== "%" && !/^(?:[dls])?v(?:w|h|i|b|min|max)$/.test(unit) && !/^cq(?:w|h|i|b|min|max)$/.test(unit)) {
    if (unit === "px") return Math.abs(parsed.n) >= 8000;
    if (unit === "pt") return Math.abs(parsed.n) >= 6000;
    if (unit === "pc") return Math.abs(parsed.n) >= 500;
    if (unit === "in") return Math.abs(parsed.n) >= 80;
    if (unit === "cm") return Math.abs(parsed.n) >= 200;
    if (unit === "mm") return Math.abs(parsed.n) >= 2000;
    if (unit === "q") return Math.abs(parsed.n) * (96 / 101.6) >= 8000;
    return false;
  }
  return Math.abs(parsed.n) >= 100;
}

function shiftTokenCovers(token: string, hidden: Set<string>, seen?: Set<string>): boolean {
  if (shiftAxisCovers(token)) return true;
  const trail = seen ?? new Set<string>();
  const defined = (hidden as HideVars).defined;
  for (const call of varCalls(token)) {
    const raw = defined?.get(call.name);
    if (raw && !trail.has(call.name)) {
      const next = new Set(trail);
      next.add(call.name);
      if (shiftTokenCovers(raw, hidden, next)) return true;
    }
    if (call.fallback && shiftTokenCovers(call.fallback, hidden, trail)) return true;
  }
  return false;
}

/** A shift of the whole desk moves it off the page. A few pixels stay. A turn stays. */
function translateHides(value: string, hidden: Set<string>): boolean {
  const found = namedFunctionCalls(value, ["translate3d", "translatex", "translatey", "translate"]);
  if (!found.length) return false;
  return found.some((call) => {
    const args = splitArgs(call.inner)
      .flatMap((part) => splitTopWords(part))
      .filter(Boolean);
    const axes = call.name === "translatex" || call.name === "translatey" ? args : args.slice(0, 2);
    return axes.some((arg) => shiftTokenCovers(arg, hidden));
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
    if (parts.some((part) => keyframeHides(part.trim(), hidden))) names.add(name);
  }
  return names;
}

function keyframeHides(part: string, hidden: Set<string>): boolean {
  if (!part.includes(":")) return false;
  if (declarationHidesDesk(part, hidden)) return true;
  return withSib(HTML_SIB, () => declarationHidesDesk(part, hidden)) && withSib(BODY_SIB, () => declarationHidesDesk(part, hidden));
}

type DeskEl = { tag: string; index: number; count: number; ofType: number; ofTypeCount: number };

const HTML_EL: DeskEl = { tag: "html", index: 1, count: 1, ofType: 1, ofTypeCount: 1 };
const BODY_EL: DeskEl = { tag: "body", index: 2, count: 2, ofType: 1, ofTypeCount: 1 };
const HEAD_EL: DeskEl = { tag: "head", index: 1, count: 2, ofType: 1, ofTypeCount: 1 };

function attrMatchesDesk(inner: string, el: DeskEl): boolean {
  if (el.tag !== "html") return false;
  const match = /^([a-zA-Z_][\w:.-]*)(?:\s*([~|^$*]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\s]+)))?(?:\s+([iIsS]))?\s*$/.exec(inner.trim());
  if (!match) return false;
  const name = (match[1] ?? "").toLowerCase();
  const op = match[2] ?? "";
  const rawValue = match[3] ?? match[4] ?? match[5] ?? "";
  const flag = (match[6] ?? "").toLowerCase();
  const value = flag === "i" ? rawValue.toLowerCase() : rawValue;
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
  /^(?:hover|focus|focus-visible|focus-within|active|visited|link|any-link|target|empty|checked|disabled|enabled|blank|fullscreen|modal|popover-open|playing|paused|user-valid|user-invalid|required|optional|read-write|indeterminate|default|valid|invalid|in-range|out-of-range|placeholder-shown|autofill|host|host-context|current|past|future)$/i;

function compoundMatches(compound: string, el: DeskEl, scopeSel: string | null = null): boolean {
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
      const ofParts = arg.split(/\s+of\s+/i);
      const formula = ofParts[0] ?? "";
      const ofSel = ofParts.length > 1 ? ofParts.slice(1).join(" of ") : "";
      let slot: number;
      if ((name === "nth-child" || name === "nth-last-child") && ofSel) {
        const matchesOf = (sib: DeskEl) => splitSelectorList(ofSel).some((part) => selectorMatchesEl(part, sib, scopeSel));
        if (!matchesOf(el)) return false;
        const list = siblingsOf(el).filter(matchesOf);
        const pos = list.findIndex((sib) => sib.tag === el.tag && sib.index === el.index) + 1;
        if (pos <= 0) return false;
        slot = name === "nth-last-child" ? list.length - pos + 1 : pos;
      } else {
        slot =
          name === "nth-child"
            ? el.index
            : name === "nth-last-child"
              ? el.count - el.index + 1
              : name === "nth-of-type"
                ? el.ofType
                : el.ofTypeCount - el.ofType + 1;
      }
      const hit = nthHits(formula, slot);
      if (hit !== true) return false;
      continue;
    }
    if (name === "is" || name === "where" || name === "matches" || name === "-webkit-any") {
      if (!splitSelectorList(arg).some((part) => selectorMatchesEl(part, el, scopeSel))) return false;
      continue;
    }
    if (name === "not") {
      if (splitSelectorList(arg).some((part) => selectorMatchesEl(part, el, scopeSel))) return false;
      continue;
    }
    if (name === "scope") {
      if (scopeSel == null) {
        if (el.tag !== "html") return false;
        continue;
      }
      if (!splitSelectorList(scopeSel).some((part) => selectorMatchesEl(part, el, null))) return false;
      continue;
    }
    if (name === "has") {
      if (!hasMatches(arg, el, scopeSel)) return false;
      continue;
    }
    if (name === "lang") {
      const doc = "en";
      const wants = arg
        .split(",")
        .map((part) => part.trim().replace(/^["']+|["']+$/g, "").toLowerCase())
        .filter(Boolean);
      if (!wants.some((want) => doc === want || doc.startsWith(`${want}-`))) return false;
      continue;
    }
    if (name === "dir") {
      const want = arg.trim().replace(/^["']|["']$/g, "").toLowerCase();
      if (want !== "ltr") return false;
      continue;
    }
    if (name === "defined" || name === "read-only") continue;
    if (STATE_PSEUDO.test(name)) return false;
    if (name === "before" || name === "after" || name === "first-line" || name === "first-letter" || name === "selection" || name === "placeholder" || name === "marker" || name === "backdrop") return false;
    return false;
  }
  return sawType || text.startsWith(":");
}

function splitCombinators(selector: string): { combinator: string; compound: string }[] {
  const steps: { combinator: string; compound: string }[] = [];
  let current = "";
  let combinator = "";
  let depth = 0;
  let bracket = 0;
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
    if (ch === "[") {
      bracket += 1;
      current += ch;
      continue;
    }
    if (ch === "]" && bracket > 0) {
      bracket -= 1;
      current += ch;
      continue;
    }
    if (depth === 0 && bracket === 0 && (ch === ">" || ch === "+" || ch === "~")) {
      flush(ch);
      continue;
    }
    if (depth === 0 && bracket === 0 && /\s/.test(ch)) {
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

function matchSteps(steps: { combinator: string; compound: string }[], index: number, el: DeskEl, scopeSel: string | null = null): boolean {
  const step = steps[index];
  if (!step || !compoundMatches(step.compound, el, scopeSel)) return false;
  if (index === 0) return true;
  const comb = step.combinator;
  if (comb === ">") {
    const parent = parentEl(el);
    return Boolean(parent) && matchSteps(steps, index - 1, parent as DeskEl, scopeSel);
  }
  if (comb === " ") {
    let ancestor = parentEl(el);
    while (ancestor) {
      if (matchSteps(steps, index - 1, ancestor, scopeSel)) return true;
      ancestor = parentEl(ancestor);
    }
    return false;
  }
  if (comb === "+" || comb === "~") {
    let sib = prevEl(el);
    while (sib) {
      if (matchSteps(steps, index - 1, sib, scopeSel)) return true;
      if (comb === "+") return false;
      sib = prevEl(sib);
    }
    return false;
  }
  return false;
}

function selectorMatchesEl(selector: string, el: DeskEl, scopeSel: string | null = null): boolean {
  const trimmed = selector.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.includes("::")) return false;
  const steps = splitCombinators(trimmed);
  if (!steps.length) return false;
  return matchSteps(steps, steps.length - 1, el, scopeSel);
}

function selectorMatchesDesk(selector: string, scopeSel: string | null = null): boolean {
  return splitSelectorList(selector).some((part) => branchHidesDesk(part.trim(), scopeSel));
}

function compoundIsUniversal(compound: string): boolean {
  const text = compound.trim();
  if (text === "*" || text === "*|*") return true;
  return /^(?::is|:where|:matches|:-webkit-any)\(\s*\*(?:\|\*)?\s*\)$/i.test(text);
}

const CHILD_PROBES: DeskEl[] = [
  { tag: "div", index: 1, count: 4, ofType: 1, ofTypeCount: 1 },
  { tag: "section", index: 2, count: 4, ofType: 1, ofTypeCount: 1 },
  { tag: "span", index: 3, count: 4, ofType: 1, ofTypeCount: 1 },
  { tag: "article", index: 4, count: 4, ofType: 1, ofTypeCount: 1 },
];

function siblingsOf(el: DeskEl): DeskEl[] {
  if (el.tag === "html") return [HTML_EL];
  if (el.tag === "head" || el.tag === "body") return [HEAD_EL, BODY_EL];
  return [];
}

function knownUnder(el: DeskEl, childOnly: boolean): DeskEl[] {
  if (el.tag === "html") return childOnly ? [HEAD_EL, BODY_EL] : [HEAD_EL, BODY_EL, ...CHILD_PROBES];
  if (el.tag === "body") return [...CHILD_PROBES];
  return [];
}

function relativeHits(sel: string, el: DeskEl, scopeSel: string | null): boolean {
  const text = sel.trim();
  if (!text) return false;
  if (text.startsWith(">")) return knownUnder(el, true).some((kid) => selectorMatchesEl(text.slice(1).trim(), kid, scopeSel));
  if (text.startsWith("+") || text.startsWith("~")) {
    const list = siblingsOf(el);
    const at = list.findIndex((sib) => sib.tag === el.tag);
    const rest = list.slice(at + 1);
    const next = text.startsWith("+") ? rest.slice(0, 1) : rest;
    return next.some((sib) => selectorMatchesEl(text.slice(1).trim(), sib, scopeSel));
  }
  return knownUnder(el, false).some((desc) => selectorMatchesEl(text, desc, scopeSel));
}

function hasMatches(arg: string, el: DeskEl, scopeSel: string | null): boolean {
  return splitSelectorList(arg).some((sel) => relativeHits(sel, el, scopeSel));
}

/** A star, or a star that only excludes a class, matches every child. A named element does not. */
function compoundCoversChildren(compound: string): boolean {
  if (compoundIsUniversal(compound)) return true;
  return CHILD_PROBES.every((el) => compoundMatches(compound, el));
}

/** A star under the desk hides every child, at any depth. A class under the desk does not. */
function hidesDeskContents(selector: string, scopeSel: string | null = null): boolean {
  return stepsHideContents(splitCombinators(selector.trim().replace(/\s+/g, " ")), scopeSel);
}

function stepsHideContents(steps: { combinator: string; compound: string }[], scopeSel: string | null = null): boolean {
  if (steps.length < 2) return false;
  const last = steps[steps.length - 1];
  if (!last || !compoundCoversChildren(last.compound)) return false;
  if (last.combinator !== ">" && last.combinator !== " ") return false;
  const left = steps.slice(0, -1);
  if (matchSteps(left, left.length - 1, HTML_EL, scopeSel) || matchSteps(left, left.length - 1, BODY_EL, scopeSel)) return true;
  if (stepsHideContents(left, scopeSel)) return true;
  if (left.length === 1) {
    const inner = functionalInner(left[0]?.compound ?? "");
    if (inner?.some((part) => branchHidesDesk(part, scopeSel))) return true;
  }
  return false;
}

function functionalInner(compound: string): string[] | null {
  const hit = /^(?::is|:where|:matches|:-webkit-any)\(([\s\S]*)\)$/i.exec(compound.trim());
  if (!hit) return null;
  return splitSelectorList(hit[1] ?? "");
}

function branchHidesDesk(selector: string, scopeSel: string | null = null): boolean {
  const sel = selector.trim();
  if (!sel || sel.includes("::")) return false;
  if (selectorMatchesEl(sel, HTML_EL, scopeSel) || selectorMatchesEl(sel, BODY_EL, scopeSel)) return true;
  if (hidesDeskContents(sel, scopeSel)) return true;
  const steps = splitCombinators(sel.replace(/\s+/g, " "));
  if (steps.length !== 1) return false;
  const inner = functionalInner(steps[0]?.compound ?? "");
  if (!inner) return false;
  return inner.some((part) => branchHidesDesk(part, scopeSel));
}

function rewriteAmp(selector: string, into: string | null): string {
  if (!into || !selector.includes("&")) return selector;
  let out = "";
  let quote = "";
  for (let i = 0; i < selector.length; i += 1) {
    const ch = selector[i] ?? "";
    const next = selector[i + 1] ?? "";
    if (quote) {
      out += ch;
      if (ch === "\\" && next) {
        out += next;
        i += 1;
        continue;
      }
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      out += ch;
      continue;
    }
    if (ch === "&") {
      out += `:is(${into})`;
      continue;
    }
    out += ch;
  }
  return out;
}

function hideProfiles(selector: string, scopeSel: string | null): Sib[] {
  const profiles: Sib[] = [];
  let html = false;
  let body = false;
  for (const part of splitSelectorList(selector)) {
    if (selectorMatchesEl(part, HTML_EL, scopeSel)) html = true;
    if (selectorMatchesEl(part, BODY_EL, scopeSel)) body = true;
  }
  if (html) profiles.push(HTML_SIB);
  if (body) profiles.push(BODY_SIB);
  return profiles;
}

function scrubNestedBody(body: string, hidden: Set<string>, anims: Set<string>, desk: boolean, scopeSel: string | null = null, nestingSel: string | null = null, profiles: Sib[] = []): string {
  if (!body.includes("{")) return desk ? scrubHideBody(body, hidden, anims, profiles) : body.trim();
  const decls = topLevelDeclarations(body);
  const flat = desk && boxCollapsesFor(decls, hidden, profiles);
  const paint = desk && (paintCollapsesFor(decls, hidden, profiles) || elementPaintPair(profiles, hidden));
  const pair = desk ? pairedHide(decls, hidden) : () => false;
  let out = "";
  let decl = "";
  let i = 0;
  let depth = 0;
  let quote = "";
  const keep = (piece: string) => {
    const next = piece.trim();
    if (!next) return;
    if (desk && (declarationHidesFor(next, hidden, profiles) || declarationUsesHidingAnim(next, anims) || pair(next))) return;
    if (flat && (isBoxClip(next) || isBoxZeroFor(next, hidden, profiles))) return;
    if (paintPieceDrops(next, hidden, profiles, paint)) return;
    out += `${next}; `;
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
      const inner = body.slice(i + 1, close);
      if (selector.startsWith("@")) {
        const at = /^@(-?[\w-]+)/.exec(selector);
        const kind = (at?.[1] ?? "").replace(/^-webkit-/, "");
        const prelude = selector.slice(at?.[0].length ?? 0);
        if (/^scope$/i.test(kind)) {
          let root = scopeRootSelector(prelude);
          if (root) root = rewriteAmp(root, nestingSel);
          const nextScope = root ?? null;
          out += `${selector}{${scrubLooseDeskRules(inner, hidden, anims, nextScope, nextScope)}}`;
        } else if (RECURSE_AT.test(kind)) out += `${selector}{${scrubNestedBody(inner, hidden, anims, desk, scopeSel, nestingSel, profiles)}}`;
        else out += `${selector}{${inner}}`;
        decl = "";
        i = close + 1;
        continue;
      }
      const looking = desk ? selector.replace(/&/g, ":is(html, body)") : selector;
      const bareAmp = selector.replace(/\s+/g, "") === "&";
      const childDesk = selectorMatchesDesk(looking, scopeSel) || (desk && bareAmp);
      const childProfiles = !childDesk ? [] : bareAmp && desk ? profiles : hideProfiles(looking, scopeSel);
      out += `${selector}{${scrubNestedBody(inner, hidden, anims, childDesk, scopeSel, looking, childProfiles)}}`;
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
  if (tail && !(desk && (declarationHidesFor(tail, hidden, profiles) || declarationUsesHidingAnim(tail, anims) || pair(tail))) && !(flat && (isBoxClip(tail) || isBoxZeroFor(tail, hidden, profiles))) && !paintPieceDrops(tail, hidden, profiles, paint)) out += tail;
  return out.replace(/;\s*$/g, "").trim();
}

function topLevelDeclarations(body: string): string[] {
  const decls: string[] = [];
  let current = "";
  let depth = 0;
  let quote = "";
  let paren = 0;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i] ?? "";
    const next = body[i + 1] ?? "";
    if (quote) {
      if (depth === 0) current += ch;
      if (ch === "\\" && next) {
        if (depth === 0) current += next;
        i += 1;
        continue;
      }
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      if (depth === 0) current += ch;
      continue;
    }
    if (ch === "(") {
      paren += 1;
      if (depth === 0) current += ch;
      continue;
    }
    if (ch === ")" && paren > 0) {
      paren -= 1;
      if (depth === 0) current += ch;
      continue;
    }
    if (ch === "{" && paren === 0) {
      depth += 1;
      current = "";
      continue;
    }
    if (ch === "}" && depth > 0) {
      depth -= 1;
      continue;
    }
    if (depth === 0 && ch === ";") {
      if (current.trim()) decls.push(current.trim());
      current = "";
      continue;
    }
    if (depth === 0) current += ch;
  }
  if (depth === 0 && current.trim()) decls.push(current.trim());
  return decls;
}

function scopeRootSelector(prelude: string): string | null {
  const open = prelude.indexOf("(");
  if (open < 0) return null;
  const close = matchingParen(prelude, open);
  if (close < 0) return null;
  const root = prelude.slice(open + 1, close).trim();
  return root || null;
}

const RECURSE_AT = /^(?:media|supports|layer|container|document|starting-style)$/i;

function scrubLooseDeskRules(css: string, hidden: Set<string>, anims: Set<string>, scopeSel: string | null = null, nestingSel: string | null = null): string {
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
      const j = i + name[0].length;
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
      if (/^scope$/i.test(kind) || RECURSE_AT.test(kind)) {
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
        const nextScope = /^scope$/i.test(kind)
          ? (scopeRootSelector(css.slice(j, open)) ?? null)
          : scopeSel;
        const resolvedScope = nextScope ? rewriteAmp(nextScope, nestingSel) : nextScope;
        out += css.slice(i, open + 1);
        out += scrubLooseDeskRules(css.slice(open + 1, close), hidden, anims, resolvedScope, resolvedScope ?? nestingSel);
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
    const opened = rewriteAmp(selector, scopeSel);
    if (selectorMatchesDesk(opened, scopeSel)) out += `${selector}{${scrubNestedBody(css.slice(open + 1, close), hidden, anims, true, scopeSel, opened, hideProfiles(opened, scopeSel))}}`;
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

function collectDeskPerspectives(css: string): number[] {
  const found: number[] = [];
  const take = (body: string) => {
    for (const part of topLevelDeclarations(body)) {
      const piece = pieceProp(part);
      if (!piece || piece.prop !== "perspective") continue;
      const px = lengthPx(piece.val);
      if (px != null && px >= 0) found.push(px);
    }
  };
  const walk = (sheet: string, scopeSel: string | null, nestingSel: string | null): void => {
    let i = 0;
    while (i < sheet.length) {
      if (sheet[i] === "@") {
        const name = /^@(-?[\w-]+)/.exec(sheet.slice(i));
        if (!name) {
          i += 1;
          continue;
        }
        const kind = (name[1] ?? "").replace(/^-webkit-/, "");
        const j = i + name[0].length;
        if (/keyframes/i.test(kind) || /^(?:font-face|page|counter-style|property)$/i.test(kind)) {
          const open = sheet.indexOf("{", j);
          const semi = sheet.indexOf(";", j);
          if (open < 0 || (semi >= 0 && semi < open)) {
            i = semi < 0 ? sheet.length : semi + 1;
            continue;
          }
          const close = matchingBrace(sheet, open);
          i = close < 0 ? sheet.length : close + 1;
          continue;
        }
        if (/^scope$/i.test(kind) || RECURSE_AT.test(kind)) {
          const open = sheet.indexOf("{", j);
          if (open < 0) return;
          const close = matchingBrace(sheet, open);
          if (close < 0) return;
          const nextScope = /^scope$/i.test(kind) ? (scopeRootSelector(sheet.slice(j, open)) ?? null) : scopeSel;
          const resolved = nextScope ? rewriteAmp(nextScope, nestingSel) : nextScope;
          walk(sheet.slice(open + 1, close), resolved, resolved ?? nestingSel);
          i = close + 1;
          continue;
        }
      }
      const open = sheet.indexOf("{", i);
      if (open < 0) return;
      const selector = sheet.slice(i, open);
      const close = matchingBrace(sheet, open);
      if (close < 0) return;
      const opened = rewriteAmp(selector, scopeSel);
      const body = sheet.slice(open + 1, close);
      if (selectorMatchesDesk(opened, scopeSel)) take(body);
      if (body.includes("{")) walk(body, scopeSel, opened);
      i = close + 1;
    }
  };
  walk(css, null, null);
  return found;
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

function collectPaintZero(css: string, hidden: Set<string>): void {
  const found = { htmlPaint: false, htmlZero: false, bodyPaint: false, bodyZero: false, contentsPaint: false, contentsZero: false };
  const take = (body: string, html: boolean, bodyEl: boolean, contents: boolean) => {
    const parts = topLevelDeclarations(body);
    const paint = parts.some((part) => isPaintContain(part));
    const zero = (profiles: Sib[]) => parts.some((part) => isBoxZeroFor(part, hidden, profiles));
    if (html && paint) found.htmlPaint = true;
    if (html && zero([HTML_SIB])) found.htmlZero = true;
    if (bodyEl && paint) found.bodyPaint = true;
    if (bodyEl && zero([BODY_SIB])) found.bodyZero = true;
    if (contents && paint) found.contentsPaint = true;
    if (contents && zero([])) found.contentsZero = true;
  };
  const walk = (sheet: string, scopeSel: string | null, nestingSel: string | null): void => {
    let i = 0;
    while (i < sheet.length) {
      if (sheet[i] === "@") {
        const name = /^@(-?[\w-]+)/.exec(sheet.slice(i));
        if (!name) {
          i += 1;
          continue;
        }
        const kind = (name[1] ?? "").replace(/^-webkit-/, "");
        const j = i + name[0].length;
        if (/keyframes/i.test(kind) || /^(?:font-face|page|counter-style|property)$/i.test(kind)) {
          const open = sheet.indexOf("{", j);
          const semi = sheet.indexOf(";", j);
          if (open < 0 || (semi >= 0 && semi < open)) {
            i = semi < 0 ? sheet.length : semi + 1;
            continue;
          }
          const close = matchingBrace(sheet, open);
          i = close < 0 ? sheet.length : close + 1;
          continue;
        }
        if (/^scope$/i.test(kind) || RECURSE_AT.test(kind)) {
          const open = sheet.indexOf("{", j);
          if (open < 0) return;
          const close = matchingBrace(sheet, open);
          if (close < 0) return;
          const nextScope = /^scope$/i.test(kind) ? (scopeRootSelector(sheet.slice(j, open)) ?? null) : scopeSel;
          const resolved = nextScope ? rewriteAmp(nextScope, nestingSel) : nextScope;
          walk(sheet.slice(open + 1, close), resolved, resolved ?? nestingSel);
          i = close + 1;
          continue;
        }
      }
      const open = sheet.indexOf("{", i);
      if (open < 0) return;
      const selector = sheet.slice(i, open);
      const close = matchingBrace(sheet, open);
      if (close < 0) return;
      const opened = rewriteAmp(selector, scopeSel);
      const body = sheet.slice(open + 1, close);
      let html = false;
      let bodyEl = false;
      let contents = false;
      for (const part of splitSelectorList(opened)) {
        if (selectorMatchesEl(part, HTML_EL, scopeSel)) html = true;
        if (selectorMatchesEl(part, BODY_EL, scopeSel)) bodyEl = true;
        if (hidesDeskContents(part, scopeSel)) contents = true;
      }
      if (html || bodyEl || contents) take(body, html, bodyEl, contents);
      if (body.includes("{")) walk(body, scopeSel, opened);
      i = close + 1;
    }
  };
  walk(css, null, null);
  const flags = hidden as HideVars;
  flags.htmlPaintZero = found.htmlPaint && found.htmlZero;
  flags.bodyPaintZero = found.bodyPaint && found.bodyZero;
  flags.contentsPaintZero = found.contentsPaint && found.contentsZero;
}

/** Add-on CSS can restyle the desk. It cannot pull a remote sheet or image, or hide the desk. */
export function sanitizePluginCss(css: string): string {
  const readable = stripCssComments(decodeCssEscapes(stripCssComments(css), false));
  const cleaned = scrubAttrUrls(scrubRemoteImageCalls(scrubPluginCss(readable)));
  const hidden = collectHideVars(cleaned);
  hidden.perspectives = collectDeskPerspectives(cleaned);
  collectPaintZero(cleaned, hidden);
  return scrubDeskHide(cleaned, hidden);
}
