import { unzip } from "./zip";

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

function rtfToText(rtf: string) {
  return rtf
    .replace(/\\'[0-9a-fA-F]{2}/g, (code) => String.fromCharCode(parseInt(code.slice(2), 16)))
    .replace(/\\u(-?\d+)\??/g, (_, num) => String.fromCharCode(Number(num)))
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\line/g, "\n")
    .replace(/\\tab/g, "\t")
    .replace(/\\[a-z]+-?\d* ?/g, "")
    .replace(/[{}]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function docxXmlToHtml(xml: string) {
  return xml
    .replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (block) => {
      const text = Array.from(block.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g))
        .map((match) => match[1])
        .join("")
        .replace(/&/g, "&")
        .replace(/</g, "<")
        .replace(/>/g, ">");
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
    return { title, html: body };
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
