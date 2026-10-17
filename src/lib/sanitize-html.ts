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
  return /^\+?(?:0+(?:\.0*)?|\.0+)%?$/.test(v);
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
  return isZeroAmount(value) || calcEvaluatesZero(value);
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
    return functionCallsNamed(val, ["opacity"]).some((inner) => valueCanHide(inner, hidden, hidesAsZero));
  }
  if (prop === "scale") {
    return splitScaleParts(val.replace(/!important/gi, "")).some((arg) => valueCanHide(arg, hidden, hidesAsZero));
  }
  if (prop === "transform" || prop === "-webkit-transform") {
    return functionCallsNamed(val, ["scale3d", "scalex", "scaley", "scalez", "scale"]).some((inner) =>
      splitArgs(inner).some((arg) => valueCanHide(arg, hidden, hidesAsZero)),
    );
  }
  if (prop === "zoom") return valueCanHide(val, hidden, hidesAsZero);
  return false;
}

function collectHideVars(css: string): Set<string> {
  const raw = new Map<string, string>();
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

function scrubHideBody(body: string, hidden: Set<string>) {
  return splitCssDeclarations(body)
    .map((part) => part.trim())
    .filter((part) => part && !declarationHidesDesk(part, hidden))
    .join("; ");
}

function hasUniversalArgument(inner: string): boolean {
  return /(?:^|[\s,])\*(?![A-Za-z0-9_-])/.test(inner);
}

/** A star next to a star still matches every element. A star in front of a class does not. */
function isStarPairSelector(selector: string) {
  const bit =
    /^(?:\*|(?::is|:where|:matches|:-webkit-any)\(\s*\*\s*\))(?:\s*(?:[+>~]\s*)?(?:\*|(?::is|:where|:matches|:-webkit-any)\(\s*\*\s*\)))+$/i;
  const parts = selector
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 && parts.every((part) => bit.test(part.replace(/\s+/g, " ")));
}

function scrubDeskHide(css: string, hidden: Set<string>) {
  let out = css.replace(/(?:html|body|:root)\b[^{]*\{[^}]*\}/gi, (block) => {
    const open = block.indexOf("{");
    if (open < 0) return block;
    return `${block.slice(0, open + 1)}${scrubHideBody(block.slice(open + 1, -1), hidden)}}`;
  });
  out = out.replace(
    /(^|[{},]\s*)(\*(?![A-Za-z0-9_-])(?:(?::[a-zA-Z-]+(?:\([^)]*\))?)*)\s*)\{([^}]*)\}/g,
    (_all, pre: string, sel: string, body: string) => `${pre}${sel}{${scrubHideBody(body, hidden)}}`,
  );
  out = out.replace(
    /(^|[{},]\s*)((?::is|:where|:matches|:-webkit-any)\(([^()]*)\)(?:(?::[a-zA-Z-]+(?:\([^)]*\))?)*)\s*)\{([^}]*)\}/gi,
    (all, pre: string, sel: string, inner: string, body: string) => {
      if (!hasUniversalArgument(inner)) return all;
      return `${pre}${sel}{${scrubHideBody(body, hidden)}}`;
    },
  );
  out = out.replace(/(^|[{}])\s*([^{};]+)\{([^}]*)\}/g, (all, pre: string, selector: string, body: string) => {
    if (!isStarPairSelector(selector)) return all;
    return `${pre}${selector}{${scrubHideBody(body, hidden)}}`;
  });
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

/** Add-on CSS can restyle the desk. It cannot pull a remote sheet or image, or hide the desk. */
export function sanitizePluginCss(css: string): string {
  const readable = stripCssComments(decodeCssEscapes(stripCssComments(css), false));
  const cleaned = scrubAttrUrls(scrubRemoteImageCalls(scrubPluginCss(readable)));
  return scrubDeskHide(cleaned, collectHideVars(cleaned));
}
