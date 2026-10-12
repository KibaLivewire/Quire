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
  let i = 0;
  let out = "";
  let skip = 0;
  const skipDest =
    /^(?:\\\*|\\(?:fonttbl|colortbl|stylesheet|info|pict|header|footer|object|datastore|themedata|colorschememapping|generator|title|author|operator|creatim|revtim|company|comment|doccomm|keywords|subject|category|manager|hlinkbase|filetbl|listtable|listoverridetable|revtbl|rsidtbl|latentstyles|xmlnstbl|mmathPr|userprops)\b)/;

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
      const rest = rtf.slice(i + 1);
      if (skip > 0 || skipDest.test(rest)) skip += 1;
      i += 1;
      continue;
    }
    if (ch === "}") {
      if (ucStack.length > 1) ucStack.pop();
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
      out += ch;
      i += 1;
      continue;
    }
    if (rtf[i + 1] === "\\" || rtf[i + 1] === "{" || rtf[i + 1] === "}") {
      out += rtf[i + 1];
      i += 2;
      continue;
    }
    if (rtf.startsWith("\\'", i)) {
      const hex = rtf.slice(i + 2, i + 4);
      if (/^[0-9a-fA-F]{2}$/.test(hex)) {
        out += String.fromCharCode(parseInt(hex, 16));
        i += 4;
        continue;
      }
    }
    const uni = /^\\u(-?\d+)\s?/.exec(rtf.slice(i));
    if (uni) {
      let n = Number(uni[1]);
      if (n < 0) n += 65536;
      n &= 0xffff;
      if (n !== 0) out += String.fromCharCode(n);
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
      if (word[1] === "par" || word[1] === "pard" || word[1] === "line") out += "\n";
      if (word[1] === "tab") out += "\t";
      i += word[0].length;
      continue;
    }
    i += 1;
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

function docxXmlToHtml(xml: string) {
  const re =
    /<w:p\b[^>]*\/?>|<\/w:p>|<w:del\b[^>]*\/?>|<\/w:del>|<w:moveFrom\b[^>]*\/?>|<\/w:moveFrom>|<w:instrText\b[^>]*\/?>|<\/w:instrText>|<mc:AlternateContent\b[^>]*\/?>|<\/mc:AlternateContent>|<mc:Choice\b[^>]*\/?>|<\/mc:Choice>|<mc:Fallback\b[^>]*\/?>|<\/mc:Fallback>|<w:tab\b[^>]*\/>|<w:tab\b[^>]*>\s*<\/w:tab>|<w:br\b[^>]*\/>|<w:br\b[^>]*>\s*<\/w:br>|<w:cr\b[^>]*\/>|<w:cr\b[^>]*>\s*<\/w:cr>|<w:noBreakHyphen\b[^>]*\/>|<w:noBreakHyphen\b[^>]*>\s*<\/w:noBreakHyphen>|<w:softHyphen\b[^>]*\/>|<w:softHyphen\b[^>]*>\s*<\/w:softHyphen>|<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
  const parts: string[] = [];
  let html = "";
  let pDepth = 0;
  let skip = 0;
  let fallbackSkip = 0;
  const altStack: { choice: boolean }[] = [];
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
      if (!raw.endsWith("/>")) altStack.push({ choice: false });
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
      if (top?.choice && !raw.endsWith("/>")) fallbackSkip = 1;
      continue;
    }
    if (raw.startsWith("</mc:Fallback")) continue;
    if (raw.startsWith("<w:p")) {
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
    if (raw.startsWith("<w:tab")) html += " ";
    else if (raw.startsWith("<w:br") || raw.startsWith("<w:cr")) html += "<br>";
    else if (raw.startsWith("<w:noBreakHyphen")) html += "-";
    else if (raw.startsWith("<w:softHyphen")) html += "\u00ad";
    else html += escapeText(decodeXml(hit[1] ?? ""));
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
