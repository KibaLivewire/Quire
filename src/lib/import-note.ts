import { unzip } from "./zip.ts";
import { sanitizeHtml } from "./sanitize-html.ts";

export const OPEN_ACCEPT = ".txt,.rtf,.doc,.docx,.html,.htm,.md,text/plain,application/rtf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function fileTitle(file: File) {
  return file.name.replace(/\.[^.]+$/, "").trim() || "Untitled";
}

function escapeText(value: string) {
  return value
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;");
}

function paragraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeText(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function characterFromCode(num: number): string {
  if (!Number.isInteger(num) || num <= 0 || num > 0x10ffff) return "";
  if (num >= 0xd800 && num <= 0xdfff) return "";
  return String.fromCodePoint(num);
}

const RTF_MARK: Record<string, string> = {
  emdash: "\u2014",
  endash: "\u2013",
  emspace: "\u2003",
  enspace: "\u2002",
  qmspace: "\u2005",
  bullet: "\u2022",
  lquote: "\u2018",
  rquote: "\u2019",
  ldblquote: "\u201c",
  rdblquote: "\u201d",
  zwj: "\u200d",
  zwnj: "\u200c",
  ltrmark: "\u200e",
  rtlmark: "\u200f",
};

function rtfMark(name: string): string {
  return RTF_MARK[name] ?? "";
}

const CP1252_EXTRA: Record<number, string> = {
  0x80: "\u20ac",
  0x82: "\u201a",
  0x83: "\u0192",
  0x84: "\u201e",
  0x85: "\u2026",
  0x86: "\u2020",
  0x87: "\u2021",
  0x88: "\u02c6",
  0x89: "\u2030",
  0x8a: "\u0160",
  0x8b: "\u2039",
  0x8c: "\u0152",
  0x8e: "\u017d",
  0x91: "\u2018",
  0x92: "\u2019",
  0x93: "\u201c",
  0x94: "\u201d",
  0x95: "\u2022",
  0x96: "\u2013",
  0x97: "\u2014",
  0x98: "\u02dc",
  0x99: "\u2122",
  0x9a: "\u0161",
  0x9b: "\u203a",
  0x9c: "\u0153",
  0x9e: "\u017e",
  0x9f: "\u0178",
};

function rtfByteChar(byte: number, codePage: number): string {
  if (codePage === 1252) {
    if (CP1252_EXTRA[byte]) return CP1252_EXTRA[byte];
    if (byte >= 0x80 && byte <= 0x9f) return "";
  } else {
    const label = WINDOWS_PAGE[codePage];
    if (label) {
      try {
        const decoded = new TextDecoder(label, { fatal: false }).decode(Uint8Array.of(byte));
        if (decoded && !decoded.includes("\uFFFD") && decoded !== "\0") return decoded;
        return "";
      } catch {
        /* a page this runtime cannot name falls through */
      }
    }
  }
  return byte === 0 ? "" : String.fromCharCode(byte);
}

const WINDOWS_PAGE: Record<number, string> = {
  874: "windows-874",
  1250: "windows-1250",
  1251: "windows-1251",
  1253: "windows-1253",
  1254: "windows-1254",
  1255: "windows-1255",
  1256: "windows-1256",
  1257: "windows-1257",
  1258: "windows-1258",
};

function decodeXml(value: string) {
  const amp = String.fromCharCode(38);
  return value
    .replaceAll(`${amp}lt;`, "<")
    .replaceAll(`${amp}gt;`, ">")
    .replaceAll(`${amp}quot;`, '"')
    .replaceAll(`${amp}apos;`, "'")
    .replace(new RegExp(`${amp}#(\\d+);`, "g"), (_, num: string) => characterFromCode(Number(num)))
    .replace(new RegExp(`${amp}#x([0-9a-fA-F]+);`, "g"), (_, hex: string) => characterFromCode(parseInt(hex, 16)))
    .replaceAll(`${amp}amp;`, amp);
}

function rtfToText(rtf: string) {
  const ucStack = [1];
  const cpStack = [1252];
  let i = 0;
  let out = "";
  let skip = 0;
  const skipDest =
    /^(?:\\\*|\\(?:fonttbl|colortbl|stylesheet|info|pict|headerl|headerr|headerf|footerl|footerr|footerf|header|footer|ftnsep|ftnsepc|ftncn|aftnsep|aftnsepc|aftncn|object|datastore|themedata|colorschememapping|generator|title|author|operator|creatim|revtim|company|comment|doccomm|keywords|subject|category|manager|hlinkbase|filetbl|listtable|listoverridetable|revtbl|rsidtbl|latentstyles|xmlnstbl|mmathPr|userprops)\b)/;
  const blockSkip =
    /^(?:\\\*\s*)?\\(?:headerl|headerr|headerf|footerl|footerr|footerf|ftnsep|ftnsepc|ftncn|aftnsep|aftnsepc|aftncn)\b/;

  function skipControl() {
    if (rtf.startsWith("\\'", i)) {
      i += 4;
      return;
    }
    const word = /^\\(?:[a-zA-Z]+-?\d*|[\\{}]) ?/.exec(rtf.slice(i));
    if (word) {
      i += word[0].length;
      return;
    }
    i += 1;
  }

  function consumeBin() {
    const bin = /^\\bin(-?\d+) ?/.exec(rtf.slice(i));
    if (!bin) return false;
    const n = Number(bin[1]);
    const count = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
    i += bin[0].length;
    i += Math.min(count, Math.max(0, rtf.length - i));
    return true;
  }

  while (i < rtf.length) {
    const ch = rtf[i];
    if (ch === "{") {
      ucStack.push(ucStack[ucStack.length - 1] ?? 1);
      cpStack.push(cpStack[cpStack.length - 1] ?? 1252);
      const rest = rtf.slice(i + 1);
      if (skip === 0 && blockSkip.test(rest) && out && !out.endsWith("\n")) out += "\n";
      if (skip > 0 || skipDest.test(rest)) skip += 1;
      i += 1;
      continue;
    }
    if (ch === "}") {
      if (ucStack.length > 1) ucStack.pop();
      if (cpStack.length > 1) cpStack.pop();
      if (skip > 0) skip -= 1;
      i += 1;
      continue;
    }
    if (ch === "\\") {
      if (consumeBin()) continue;
    }
    if (skip > 0) {
      if (ch === "\\") skipControl();
      else i += 1;
      continue;
    }
    if (ch !== "\\") {
      if (ch === "\n" || ch === "\r") {
        i += 1;
        continue;
      }
      out += ch;
      i += 1;
      continue;
    }
    if (rtf[i + 1] === "\n" || rtf[i + 1] === "\r") {
      out += "\n";
      i += 2;
      continue;
    }
    if (rtf[i + 1] === "\\" || rtf[i + 1] === "{" || rtf[i + 1] === "}") {
      out += rtf[i + 1];
      i += 2;
      continue;
    }
    const mark = rtf[i + 1];
    if (mark === "~") {
      out += "\u00a0";
      i += 2;
      continue;
    }
    if (mark === "-") {
      out += "\u00ad";
      i += 2;
      continue;
    }
    if (mark === "_") {
      out += "-";
      i += 2;
      continue;
    }
    if (rtf.startsWith("\\'", i)) {
      const codePage = cpStack[cpStack.length - 1] ?? 1252;
      if (codePage === 65001) {
        const bytes: number[] = [];
        while (i < rtf.length) {
          if (rtf[i] === "\n" || rtf[i] === "\r") {
            i += 1;
            continue;
          }
          if (!rtf.startsWith("\\'", i) || !/^[0-9a-fA-F]{2}$/.test(rtf.slice(i + 2, i + 4))) break;
          bytes.push(parseInt(rtf.slice(i + 2, i + 4), 16));
          i += 4;
        }
        if (!bytes.length) {
          i += 1;
          continue;
        }
        const glyph = new TextDecoder("utf-8", { fatal: false }).decode(Uint8Array.from(bytes)).replace(/\uFFFD/g, "");
        if (glyph) out += glyph;
        continue;
      }
      const hex = rtf.slice(i + 2, i + 4);
      if (/^[0-9a-fA-F]{2}$/.test(hex)) {
        const glyph = rtfByteChar(parseInt(hex, 16), codePage);
        if (glyph) out += glyph;
        i += 4;
        continue;
      }
    }
    const uni = /^\\u(-?\d+)\s?/.exec(rtf.slice(i));
    if (uni) {
      let n = Number(uni[1]);
      if (n < 0) n += 65536;
      let glyph = "";
      if (n > 0xffff) glyph = characterFromCode(n);
      else if ((n & 0xffff) !== 0) glyph = String.fromCharCode(n & 0xffff);
      if (glyph) out += glyph;
      i += uni[0].length;
      let skipAnsi = ucStack[ucStack.length - 1] ?? 1;
      while (skipAnsi > 0 && i < rtf.length) {
        if (rtf.startsWith("\\'", i)) {
          i += 4;
          skipAnsi -= 1;
          continue;
        }
        if (rtf[i] === "\\") break;
        i += 1;
        skipAnsi -= 1;
      }
      continue;
    }
    const word = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(rtf.slice(i));
    if (word) {
      if (word[1] === "uc") ucStack[ucStack.length - 1] = Math.max(0, Number(word[2] || 0));
      if (word[1] === "ansicpg") {
        const page = Number(word[2] || 0);
        if (Number.isFinite(page) && page > 0) cpStack[cpStack.length - 1] = Math.floor(page);
      } else if (word[1] === "ansi") cpStack[cpStack.length - 1] = 1252;
      else if (word[1] === "mac") cpStack[cpStack.length - 1] = 10000;
      else if (word[1] === "pc") cpStack[cpStack.length - 1] = 437;
      else if (word[1] === "pca") cpStack[cpStack.length - 1] = 850;
      if (word[1] === "par" || word[1] === "pard" || word[1] === "line" || word[1] === "lbr" || word[1] === "page" || word[1] === "column" || word[1] === "sect" || word[1] === "cell" || word[1] === "nestcell" || word[1] === "row" || word[1] === "nestrow" || word[1] === "softline" || word[1] === "softpage" || word[1] === "softcol") out += "\n";
      else if (word[1] === "tab") out += "\t";
      else if (word[1] === "footnote" || word[1] === "annotation" || word[1] === "chftn" || word[1] === "chatn") {
        if (!out.endsWith(" ") && !out.endsWith("\n")) out += " ";
      } else {
        const glyph = rtfMark(word[1]);
        if (glyph) out += glyph;
      }
      i += word[0].length;
      continue;
    }
    i += 1;
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

function docxXmlToHtml(xml: string) {
  const re =
    /<w:p\b[^>]*\/?>|<\/w:p>|<w:del\b[^>]*\/?>|<\/w:del>|<w:moveFrom\b[^>]*\/?>|<\/w:moveFrom>|<w:instrText\b[^>]*\/?>|<\/w:instrText>|<mc:AlternateContent\b[^>]*\/?>|<\/mc:AlternateContent>|<mc:Choice\b[^>]*\/?>|<\/mc:Choice>|<mc:Fallback\b[^>]*\/?>|<\/mc:Fallback>|<w:tab\b[^>]*\/>|<w:tab\b[^>]*>\s*<\/w:tab>|<w:ptab\b[^>]*\/>|<w:ptab\b[^>]*>\s*<\/w:ptab>|<w:separator\b[^>]*\/>|<w:separator\b[^>]*>\s*<\/w:separator>|<w:continuationSeparator\b[^>]*\/>|<w:continuationSeparator\b[^>]*>\s*<\/w:continuationSeparator>|<w:footnoteReference\b[^>]*\/>|<w:footnoteReference\b[^>]*>\s*<\/w:footnoteReference>|<w:endnoteReference\b[^>]*\/>|<w:endnoteReference\b[^>]*>\s*<\/w:endnoteReference>|<w:sym\b[^>]*\/>|<w:sym\b[^>]*>\s*<\/w:sym>|<w:br\b[^>]*\/>|<w:br\b[^>]*>\s*<\/w:br>|<w:cr\b[^>]*\/>|<w:cr\b[^>]*>\s*<\/w:cr>|<w:lastRenderedPageBreak\b[^>]*\/>|<w:lastRenderedPageBreak\b[^>]*>\s*<\/w:lastRenderedPageBreak>|<w:noBreakHyphen\b[^>]*\/>|<w:noBreakHyphen\b[^>]*>\s*<\/w:noBreakHyphen>|<w:softHyphen\b[^>]*\/>|<w:softHyphen\b[^>]*>\s*<\/w:softHyphen>|<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
  const parts: string[] = [];
  let html = "";
  let pDepth = 0;
  let skip = 0;
  let fallbackSkip = 0;
  const altStack: { choice: boolean; wrote: boolean }[] = [];
  const markWrote = () => {
    for (const frame of altStack) {
      if (frame.choice) frame.wrote = true;
    }
  };
  const flush = () => {
    if (html.replace(/<br>/g, "").trim()) parts.push(`<p>${html}</p>`);
    html = "";
  };
  for (const hit of xml.matchAll(re)) {
    const raw = hit[0];
    if (fallbackSkip > 0) {
      if (raw.startsWith("<mc:Fallback") && !raw.endsWith("/>")) fallbackSkip += 1;
      else if (raw.startsWith("</mc:Fallback") && fallbackSkip > 0) fallbackSkip -= 1;
      continue;
    }
    if (raw.startsWith("<mc:AlternateContent")) {
      if (!raw.endsWith("/>")) altStack.push({ choice: false, wrote: false });
      continue;
    }
    if (raw.startsWith("</mc:AlternateContent")) {
      altStack.pop();
      continue;
    }
    if (raw.startsWith("<mc:Choice")) {
      const top = altStack[altStack.length - 1];
      if (top) top.choice = true;
      continue;
    }
    if (raw.startsWith("</mc:Choice")) continue;
    if (raw.startsWith("<mc:Fallback")) {
      const top = altStack[altStack.length - 1];
      if (top?.wrote && !raw.endsWith("/>")) fallbackSkip = 1;
      continue;
    }
    if (raw.startsWith("</mc:Fallback")) continue;
    if (raw.startsWith("<w:p>") || raw.startsWith("<w:p ") || raw.startsWith("<w:p/")) {
      if (!raw.endsWith("/>")) {
        if (pDepth > 0 && html && !/ $/.test(html) && !html.endsWith("<br>")) html += " ";
        pDepth += 1;
      }
      continue;
    }
    if (raw.startsWith("</w:p")) {
      if (pDepth > 1 && html && !/ $/.test(html) && !html.endsWith("<br>")) html += " ";
      if (pDepth > 0) pDepth -= 1;
      if (pDepth === 0) flush();
      continue;
    }
    if (raw.startsWith("<w:del") || raw.startsWith("<w:moveFrom") || raw.startsWith("<w:instrText")) {
      if (!raw.endsWith("/>")) skip += 1;
      continue;
    }
    if (raw.startsWith("</w:del") || raw.startsWith("</w:moveFrom") || raw.startsWith("</w:instrText")) {
      if (skip > 0) skip -= 1;
      continue;
    }
    if (pDepth <= 0 || skip > 0) continue;
    if (raw.startsWith("<w:tab") || raw.startsWith("<w:ptab") || raw.startsWith("<w:separator") || raw.startsWith("<w:continuationSeparator") || raw.startsWith("<w:footnoteReference") || raw.startsWith("<w:endnoteReference")) {
      html += " ";
      markWrote();
    } else if (raw.startsWith("<w:sym")) {
      const ch = /w:char="([0-9A-Fa-f]+)"/.exec(raw);
      const glyph = ch ? characterFromCode(parseInt(ch[1], 16)) : "";
      const piece = glyph ? escapeText(glyph) : " ";
      html += piece;
      if (piece.trim() || piece === " ") markWrote();
    } else if (raw.startsWith("<w:br") || raw.startsWith("<w:cr") || raw.startsWith("<w:lastRenderedPageBreak")) {
      html += "<br>";
      markWrote();
    } else if (raw.startsWith("<w:noBreakHyphen")) {
      html += "-";
      markWrote();
    } else if (raw.startsWith("<w:softHyphen")) {
      html += "\u00ad";
      markWrote();
    } else {
      const text = escapeText(decodeXml(hit[1] ?? ""));
      if (!text) continue;
      html += text;
      markWrote();
    }
  }
  if (pDepth > 0) flush();
  return parts.join("");
}

export async function importDocument(file: File): Promise<{ title: string; html: string }> {
  const title = fileTitle(file);
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (name.endsWith(".pdf") || (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) {
    throw new Error("PDF files can be exported, but Quire cannot edit a PDF as a page.");
  }

  if (name.endsWith(".docx")) {
    const files = await unzip(buffer);
    const xml = files.get("word/document.xml");
    if (!xml) throw new Error("That Word file did not have a document inside.");
    return { title, html: docxXmlToHtml(xml) || paragraphs(title) };
  }

  if (bytes[0] === 0xd0 && bytes[1] === 0xcf) {
    throw new Error("This is an old Word 97 .doc. Save it as .docx or .rtf, then open it.");
  }

  const text = new TextDecoder().decode(buffer);

  if (name.endsWith(".rtf") || text.startsWith("{\\rtf")) {
    return { title, html: paragraphs(rtfToText(text)) };
  }

  if (name.endsWith(".html") || name.endsWith(".htm")) {
    const body = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? text;
    return { title, html: sanitizeHtml(body) };
  }

  if (name.endsWith(".md")) {
    const html = escapeText(text)
      .replace(/^### (.*)$/gm, "<h3>$1</h3>")
      .replace(/^## (.*)$/gm, "<h2>$1</h2>")
      .replace(/^# (.*)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .split(/\n{2,}/)
      .map((block) => (block.startsWith("<h") ? block : `<p>${block.replace(/\n/g, "<br>")}</p>`))
      .join("");
    return { title, html };
  }

  if (name.endsWith(".doc") && text.charCodeAt(0) === 0xd0) {
    throw new Error("This is an old Word 97 .doc. Save it as .docx or .rtf, then open it.");
  }

  return { title, html: paragraphs(text) };
}
