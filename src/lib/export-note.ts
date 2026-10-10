import { buildPdf } from "./pdf";
import { zipStore } from "./zip";
import { escapeHtml, plainText } from "./utils";
import { saveFile } from "./native";
import { sanitizeHtml } from "./sanitize-html";

function safeName(title: string) {
  const cleaned = title.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "").replace(/\.+$/g, "").trim();
  return cleaned.slice(0, 80) || "untitled";
}

function htmlToPlainDocument(html: string) {
  const amp = String.fromCharCode(38);
  const withBreaks = html
    .replace(/<div[^>]*data-quire-sheet[^>]*>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|h3|h4|li|tr|blockquote|pre)>/gi, "\n");
  return withBreaks
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<img[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(new RegExp(`${amp}nbsp;`, "gi"), " ")
    .replace(new RegExp(`${amp}lt;`, "gi"), "<")
    .replace(new RegExp(`${amp}gt;`, "gi"), ">")
    .replace(new RegExp(`${amp}quot;`, "gi"), '"')
    .replace(new RegExp(`${amp}#39;`, "gi"), "'")
    .replace(new RegExp(`${amp}amp;`, "gi"), amp)
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
${sanitizeHtml(content)}
</body>
</html>`;
  download(`${safeName(title)}.html`, html, "text/html");
}

export function exportText(title: string, content: string) {
  download(`${safeName(title)}.txt`, `${title}\n\n${htmlToPlainDocument(content)}\n`, "text/plain");
}

export function exportMarkdown(title: string, content: string) {
  download(`${safeName(title)}.md`, `# ${title}\n\n${htmlToMarkdown(content)}\n`, "text/markdown");
}

function rtfUnicode(code: number) {
  const units =
    code > 0xffff
      ? [0xd800 + ((code - 0x10000) >> 10), 0xdc00 + ((code - 0x10000) & 0x3ff)]
      : [code];
  return units
    .map((unit) => {
      const signed = unit > 32767 ? unit - 65536 : unit;
      return `\\u${signed}?`;
    })
    .join("");
}

function rtfEscape(value: string) {
  let out = "";
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (char === "\\") out += "\\\\";
    else if (char === "{") out += "\\{";
    else if (char === "}") out += "\\}";
    else if (code > 127) out += rtfUnicode(code);
    else out += char;
  }
  return out;
}

function htmlToRtf(html: string) {
  const root = document.createElement("div");
  root.innerHTML = sanitizeHtml(html);
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
${sanitizeHtml(content)}
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

type DocxImage = {
  id: string;
  name: string;
  ext: "png" | "jpeg";
  bytes: Uint8Array;
  cx: number;
  cy: number;
};

function dataUrlBytes(src: string): { bytes: Uint8Array; ext: "png" | "jpeg" } | null {
  const match = /^data:image\/(png|jpe?g);base64,([a-z0-9+/=\s]+)$/i.exec(src.trim());
  if (!match) return null;
  const kind = match[1].toLowerCase();
  const bin = atob(match[2].replace(/\s/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i) & 0xff;
  return { bytes, ext: kind === "png" ? "png" : "jpeg" };
}

async function prepareDocxImages(root: HTMLElement): Promise<Map<string, DocxImage>> {
  const map = new Map<string, DocxImage>();
  if (typeof document === "undefined") return map;
  let n = 0;
  for (const node of root.querySelectorAll("img")) {
    const src = node.getAttribute("src") || "";
    if (!src.startsWith("data:image") || map.has(src) || n >= 30) continue;
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("image"));
        el.src = src;
      });
      const maxEdge = 1600;
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height, 1));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      const jpeg = /^data:image\/jpe?g/i.test(src);
      if (jpeg) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }
      ctx.drawImage(img, 0, 0, width, height);
      const url = canvas.toDataURL(jpeg ? "image/jpeg" : "image/png", 0.9);
      const parsed = dataUrlBytes(url);
      if (!parsed) continue;
      const fit = Math.min(1, 576 / width);
      n += 1;
      map.set(src, {
        id: `rIdImg${n}`,
        name: `image${n}.${parsed.ext === "jpeg" ? "jpeg" : "png"}`,
        ext: parsed.ext,
        bytes: parsed.bytes,
        cx: Math.round(width * fit * 9525),
        cy: Math.round(height * fit * 9525),
      });
    } catch {
      /* skip a picture Word cannot embed */
    }
  }
  return map;
}

function imageDrawing(pic: DocxImage) {
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${pic.cx}" cy="${pic.cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${pic.id.replace(/\D/g, "") || "1"}" name="${xmlEscape(pic.name)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="${xmlEscape(pic.name)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${pic.id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${pic.cx}" cy="${pic.cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

function inlineRuns(el: HTMLElement, images: Map<string, DocxImage>, bold = false, italic = false): string {
  let out = "";
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (!text) return;
      const props = `${bold ? "<w:b/>" : ""}${italic ? "<w:i/>" : ""}`;
      out += `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}<w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`;
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName;
    if (tag === "IMG") {
      const pic = images.get(node.getAttribute("src") || "");
      if (pic) out += imageDrawing(pic);
      return;
    }
    out += inlineRuns(node, images, bold || tag === "STRONG" || tag === "B" || /^H[1-3]$/.test(tag), italic || tag === "EM" || tag === "I");
  });
  return out;
}

function blockXml(el: HTMLElement, images: Map<string, DocxImage>): string {
  const runs = inlineRuns(el, images);
  if (!runs.trim()) return "";
  const bullet = el.tagName === "LI" ? `<w:r><w:t xml:space="preserve">${xmlEscape("• ")}</w:t></w:r>` : "";
  return `<w:p>${bullet}${runs}</w:p>`;
}

function cellBody(cell: HTMLElement, images: Map<string, DocxImage>): string {
  const paras = [...cell.children].filter((el) => /^(P|H1|H2|H3|LI|BLOCKQUOTE|DIV)$/.test(el.tagName));
  if (!paras.length) {
    const runs = inlineRuns(cell, images);
    return runs.trim() ? `<w:p>${runs}</w:p>` : "<w:p/>";
  }
  const bits = paras
    .map((el) => {
      const node = el as HTMLElement;
      if (node.tagName === "DIV") {
        const runs = inlineRuns(node, images);
        return runs.trim() ? `<w:p>${runs}</w:p>` : "";
      }
      return blockXml(node, images);
    })
    .filter(Boolean);
  return bits.join("") || "<w:p/>";
}

function tableXml(table: HTMLElement, images: Map<string, DocxImage>): string {
  const rows =
    table instanceof HTMLTableElement
      ? [...table.rows]
      : [...table.querySelectorAll(":scope > tr, :scope > thead > tr, :scope > tbody > tr")];
  if (!rows.length) return "";
  const width = Math.max(...rows.map((row) => (row instanceof HTMLTableRowElement ? row.cells.length : 1)), 1);
  const grid = Array.from({ length: width }, () => `<w:gridCol w:w="${Math.round(9000 / width)}"/>`).join("");
  const body = rows
    .map((row) => {
      const cells =
        row instanceof HTMLTableRowElement
          ? [...row.cells]
          : [...row.children].filter((el) => el.tagName === "TD" || el.tagName === "TH");
      const tds = cells
        .map(
          (cell) =>
            `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>${cellBody(cell as HTMLElement, images)}</w:tc>`,
        )
        .join("");
      return `<w:tr>${tds}</w:tr>`;
    })
    .join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${body}</w:tbl>`;
}

function walkBlocks(parent: HTMLElement, out: string[], images: Map<string, DocxImage>) {
  parent.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      if ((child.textContent || "").trim()) {
        out.push(`<w:p><w:r><w:t xml:space="preserve">${xmlEscape(child.textContent || "")}</w:t></w:r></w:p>`);
      }
      return;
    }
    if (!(child instanceof HTMLElement)) return;
    const tag = child.tagName;
    if (tag === "IMG") {
      const pic = images.get(child.getAttribute("src") || "");
      if (pic) out.push(`<w:p>${imageDrawing(pic)}</w:p>`);
      return;
    }
    if (tag === "TABLE") {
      const xml = tableXml(child, images);
      if (xml) out.push(xml);
      return;
    }
    if (/^(P|H1|H2|H3|LI|BLOCKQUOTE)$/.test(tag)) {
      const xml = blockXml(child, images);
      if (xml) out.push(xml);
      return;
    }
    walkBlocks(child, out, images);
  });
}

function htmlToDocxParagraphs(title: string, root: HTMLElement, images: Map<string, DocxImage>) {
  const blocks: string[] = [
    `<w:p><w:r><w:rPr><w:b/><w:sz w:val="36"/></w:rPr><w:t xml:space="preserve">${xmlEscape(title)}</w:t></w:r></w:p>`,
  ];
  walkBlocks(root, blocks, images);
  if (blocks.length === 1) {
    const runs = inlineRuns(root, images);
    if (runs.trim()) blocks.push(`<w:p>${runs}</w:p>`);
  }
  return blocks.join("");
}

export async function exportDocx(title: string, content: string) {
  const encoder = new TextEncoder();
  const root = document.createElement("div");
  root.innerHTML = sanitizeHtml(content);
  const images = await prepareDocxImages(root);
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${htmlToDocxParagraphs(title, root, images)}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`;
  const extras = [...images.values()];
  const defaults = [
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`,
    `<Default Extension="xml" ContentType="application/xml"/>`,
  ];
  if (extras.some((item) => item.ext === "jpeg")) defaults.push(`<Default Extension="jpeg" ContentType="image/jpeg"/>`);
  if (extras.some((item) => item.ext === "png")) defaults.push(`<Default Extension="png" ContentType="image/png"/>`);
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${defaults.join("")}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${extras
    .map(
      (item) =>
        `<Relationship Id="${item.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${item.name}"/>`,
    )
    .join("")}</Relationships>`;
  const blob = zipStore([
    { name: "[Content_Types].xml", data: encoder.encode(types) },
    { name: "_rels/.rels", data: encoder.encode(rels) },
    { name: "word/_rels/document.xml.rels", data: encoder.encode(docRels) },
    { name: "word/document.xml", data: encoder.encode(documentXml) },
    ...extras.map((item) => ({ name: `word/media/${item.name}`, data: item.bytes })),
  ]);
  downloadBlob(`${safeName(title)}.docx`, blob);
}

export async function exportPdf(
  title: string,
  content: string,
  opts?: { grayscaleImages?: boolean; pageWidth?: number; pageHeight?: number },
) {
  const bytes = await buildPdf(title, content, opts);
  downloadBlob(`${safeName(title)}.pdf`, new Blob([bytes], { type: "application/pdf" }));
}

function htmlToMarkdown(html: string): string {
  const node = document.createElement("div");
  node.innerHTML = sanitizeHtml(html);
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
  if (tag === "img") return " [picture] ";
  if (tag === "a") {
    const href = el.getAttribute("href") || "";
    return href ? `[${inner}](${href})` : inner;
  }
  return inner;
}
