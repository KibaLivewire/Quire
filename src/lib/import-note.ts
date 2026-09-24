import { unzip } from "./zip";
import { sanitizeHtml } from "./sanitize-html";

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

function decodeXml(value: string) {
  const amp = String.fromCharCode(38);
  return value
    .replaceAll(`${amp}lt;`, "<")
    .replaceAll(`${amp}gt;`, ">")
    .replaceAll(`${amp}quot;`, '"')
    .replaceAll(`${amp}apos;`, "'")
    .replace(new RegExp(`${amp}#(\\d+);`, "g"), (_, num: string) => String.fromCharCode(Number(num)))
    .replace(new RegExp(`${amp}#x([0-9a-fA-F]+);`, "g"), (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replaceAll(`${amp}amp;`, amp);
}

function rtfToText(rtf: string) {
  let uc = 1;
  let i = 0;
  let out = "";
  while (i < rtf.length) {
    const ch = rtf[i];
    if (ch === "{" || ch === "}") {
      i += 1;
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
      out += String.fromCharCode(n & 0xffff);
      i += uni[0].length;
      let skip = uc;
      while (skip > 0 && i < rtf.length) {
        if (rtf.startsWith("\\'", i)) {
          i += 4;
          skip -= 1;
          continue;
        }
        if (rtf[i] === "\\") break;
        i += 1;
        skip -= 1;
      }
      continue;
    }
    const word = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(rtf.slice(i));
    if (word) {
      if (word[1] === "uc") uc = Math.max(0, Number(word[2] || 0));
      if (word[1] === "par" || word[1] === "pard") out += "\n";
      if (word[1] === "line") out += "\n";
      if (word[1] === "tab") out += "\t";
      i += word[0].length;
      continue;
    }
    i += 1;
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

function docxXmlToHtml(xml: string) {
  return xml
    .replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (block) => {
      const text = Array.from(block.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g))
        .map((match) => decodeXml(match[1]))
        .join("");
      return text.trim() ? `<p>${escapeText(text)}</p>` : "";
    })
    .replace(/<[^>]+>/g, "")
    .trim();
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

  if (name.endsWith(".html") || name.endsWith(".htm") || /<html/i.test(text)) {
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
