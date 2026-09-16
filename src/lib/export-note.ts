import { buildPdf } from "./pdf";
import { zipStore } from "./zip";
import { escapeHtml, plainText } from "./utils";
import { saveFile } from "./native";

function safeName(title: string) {
  return title.replace(/[^\w\s-]+/g, "").trim() || "untitled";
}

function downloadBlob(filename: string, blob: Blob) {
  void saveFile(filename, blob);
}

function download(filename: string, contents: string, type: string) {
  downloadBlob(filename, new Blob([contents], { type }));
}

export function exportHtml(title: string, content: string) {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  body { font: 12pt/1.6 Georgia, serif; color: #1c1917; max-width: 8.5in; margin: 0.75in auto; }
  img { max-width: 100%; height: auto; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${content}
</body>
</html>`;
  download(`${safeName(title)}.html`, html, "text/html");
}

export function exportText(title: string, content: string) {
  download(`${safeName(title)}.txt`, `${title}\n\n${plainText(content)}\n`, "text/plain");
}

export function exportMarkdown(title: string, content: string) {
  download(`${safeName(title)}.md`, `# ${title}\n\n${htmlToMarkdown(content)}\n`, "text/markdown");
}

function rtfEscape(value: string) {
  let out = "";
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (char === "\\") out += "\\\\";
    else if (char === "{") out += "\\{";
    else if (char === "}") out += "\\}";
    else if (code > 127) out += `\\u${code}?`;
    else out += char;
  }
  return out;
}

function htmlToRtf(html: string) {
  const root = document.createElement("div");
  root.innerHTML = html;
  const parts: string[] = [];
  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(rtfEscape(node.textContent ?? ""));
      return;
    }
    if (!(node instanceof HTMLElement)) {
      Array.from(node.childNodes).forEach(walk);
      return;
    }
    const tag = node.tagName.toLowerCase();
    const open =
      tag === "strong" || tag === "b"
        ? "{\\b "
        : tag === "em" || tag === "i"
          ? "{\\i "
          : tag === "u"
            ? "{\\ul "
            : "";
    if (open) parts.push(open);
    if (tag === "br") parts.push("\\line ");
    Array.from(node.childNodes).forEach(walk);
    if (open) parts.push("}");
    if (tag === "p" || tag === "h1" || tag === "h2" || tag === "h3" || tag === "li" || tag === "div") {
      parts.push("\\par ");
    }
  }
  walk(root);
  return parts.join("");
}

export function exportRtf(title: string, content: string) {
  const body = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Times New Roman;}}\\f0\\fs24{\\b ${rtfEscape(title)}}\\par\\par ${htmlToRtf(content)}}`;
  download(`${safeName(title)}.rtf`, body, "application/rtf");
}

export function exportDoc(title: string, content: string) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
  @page { size: 8.5in 11in; margin: 1in; }
  body { font-family: Times New Roman, serif; font-size: 12pt; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${content}
</body>
</html>`;
  download(`${safeName(title)}.doc`, html, "application/msword");
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

function htmlToDocxParagraphs(title: string, html: string) {
  const root = document.createElement("div");
  root.innerHTML = html;
  const blocks: string[] = [
    `<w:p><w:r><w:rPr><w:b/><w:sz w:val="36"/></w:rPr><w:t xml:space="preserve">${xmlEscape(title)}</w:t></w:r></w:p>`,
  ];
  const chunks = root.querySelectorAll("p, h1, h2, h3, li, blockquote");
  const sources = chunks.length ? chunks : [root];
  sources.forEach((el) => {
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!text) return;
    const heading = el.tagName === "H1" || el.tagName === "H2" || el.tagName === "H3";
    const run = heading
      ? `<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`
      : `<w:r><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`;
    blocks.push(`<w:p>${run}</w:p>`);
  });
  return blocks.join("");
}

export async function exportDocx(title: string, content: string) {
  const encoder = new TextEncoder();
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${htmlToDocxParagraphs(title, content)}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`;
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const blob = zipStore([
    { name: "[Content_Types].xml", data: encoder.encode(types) },
    { name: "_rels/.rels", data: encoder.encode(rels) },
    { name: "word/document.xml", data: encoder.encode(documentXml) },
  ]);
  downloadBlob(`${safeName(title)}.docx`, blob);
}

export async function exportPdf(title: string, content: string, opts?: { grayscaleImages?: boolean }) {
  const bytes = await buildPdf(title, content, opts);
  downloadBlob(`${safeName(title)}.pdf`, new Blob([bytes], { type: "application/pdf" }));
}

function htmlToMarkdown(html: string): string {
  const node = document.createElement("div");
  node.innerHTML = html;
  return walkMd(node).replace(/\n{3,}/g, "\n\n").trim();
}

function walkMd(el: Node): string {
  if (el.nodeType === Node.TEXT_NODE) return el.textContent ?? "";
  if (!(el instanceof HTMLElement)) return Array.from(el.childNodes).map(walkMd).join("");
  const inner = Array.from(el.childNodes).map(walkMd).join("");
  const tag = el.tagName.toLowerCase();
  if (tag === "h1") return `\n# ${inner}\n\n`;
  if (tag === "h2") return `\n## ${inner}\n\n`;
  if (tag === "h3") return `\n### ${inner}\n\n`;
  if (tag === "p") return `${inner}\n\n`;
  if (tag === "br") return "\n";
  if (tag === "strong" || tag === "b") return `**${inner}**`;
  if (tag === "em" || tag === "i") return `*${inner}*`;
  if (tag === "blockquote") return `\n> ${inner.trim()}\n\n`;
  if (tag === "li") return `- ${inner.trim()}\n`;
  if (tag === "a") {
    const href = el.getAttribute("href") || "";
    return href ? `[${inner}](${href})` : inner;
  }
  return inner;
}
