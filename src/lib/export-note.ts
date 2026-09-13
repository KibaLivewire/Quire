import { zipStore } from "./zip";
import { escapeHtml, plainText } from "./utils";

function safeName(title: string) {
  return title.replace(/[^\w\s-]+/g, "").trim() || "untitled";
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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

function pdfEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function exportPdf(title: string, content: string) {
  const text = `${title}\n\n${plainText(content)}`;
  const lines: string[] = [];
  for (const paragraph of text.split(/\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > 90) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
  }
  const pageLines = 48;
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += pageLines) pages.push(lines.slice(i, i + pageLines));
  if (!pages.length) pages.push([title]);

  const objects: string[] = [
    "",
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>",
  ];
  const pageIds: number[] = [];
  pages.forEach((chunk) => {
    const stream = `BT /F1 12 Tf 72 720 Td 16 TL (${pdfEscape(chunk[0] ?? "")}) Tj\n${chunk
      .slice(1)
      .map((line) => `T* (${pdfEscape(line)}) Tj`)
      .join("\n")}\nET`;
    const contentId = objects.length;
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageId = objects.length;
    pageIds.push(pageId);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`,
    );
  });
  objects[2] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`;

  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = body.length;
    body += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const start = body.length;
  body += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i += 1) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer << /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  download(`${safeName(title)}.pdf`, body, "application/pdf");
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
