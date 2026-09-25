
type PdfImage = { key: string; src: string; width: number; height: number; jpeg: Uint8Array };
type PdfPiece = { kind: "lines"; lines: string[] } | { kind: "image"; img: PdfImage } | { kind: "sheet" };
type PdfXRef = { name: string; key: string };

function concat(parts: Uint8Array[]) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function str(value: string) {
  return new TextEncoder().encode(value);
}

function pdfEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Times-Roman speaks WinAnsi, not UTF-8. Map the bytes so the stream length stays honest. */
function winAnsi(value: string) {
  const out = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code === 0x2018 || code === 0x2019) out[i] = 0x91 + (code - 0x2018);
    else if (code === 0x201c || code === 0x201d) out[i] = 0x93 + (code - 0x201c);
    else if (code === 0x2014) out[i] = 0x97;
    else if (code === 0x2013) out[i] = 0x96;
    else if (code === 0x2026) out[i] = 0x85;
    else if (code === 0x2022) out[i] = 0x95;
    else if (code >= 32 && code <= 126) out[i] = code;
    else if (code >= 160 && code <= 255) out[i] = code;
    else if (code === 10 || code === 13 || code === 9) out[i] = code;
    else out[i] = 0x3f;
  }
  return out;
}

function readEdit(style: string) {
  let filter = "";
  let rotate = 0;
  let flipH = 1;
  let flipV = 1;
  const filterMatch = /filter\s*:\s*([^;]+)/i.exec(style);
  if (filterMatch) filter = filterMatch[1].trim();
  const transformMatch = /transform\s*:\s*([^;]+)/i.exec(style);
  if (transformMatch) {
    const transform = transformMatch[1];
    const rot = /rotate\(\s*(-?\d+(?:\.\d+)?)deg\s*\)/i.exec(transform);
    if (rot) rotate = Number(rot[1]) || 0;
    const scale = /scale\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/i.exec(transform);
    if (scale) {
      flipH = Number(scale[1]) < 0 ? -1 : 1;
      flipV = Number(scale[2]) < 0 ? -1 : 1;
    }
  }
  const turns = ((rotate % 360) + 360) % 360;
  return { filter, rotate, flipH, flipV, quarter: turns === 90 || turns === 270 };
}

async function jpegFromSrc(
  src: string,
  grayscale: boolean,
  editStyle = "",
): Promise<{ jpeg: Uint8Array; width: number; height: number } | null> {
  if (!src.startsWith("data:image")) return null;
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  const max = 1600;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const dw = Math.max(1, Math.round(img.width * scale));
  const dh = Math.max(1, Math.round(img.height * scale));
  const edit = readEdit(editStyle);
  canvas.width = edit.quarter ? dh : dw;
  canvas.height = edit.quarter ? dw : dh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.save();
  if (edit.filter) ctx.filter = edit.filter;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((edit.rotate * Math.PI) / 180);
  ctx.scale(edit.flipH, edit.flipV);
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
  if (grayscale) {
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < data.data.length; i += 4) {
      const y = data.data[i] * 0.299 + data.data[i + 1] * 0.587 + data.data[i + 2] * 0.114;
      data.data[i] = data.data[i + 1] = data.data[i + 2] = y;
    }
    ctx.putImageData(data, 0, 0);
  }
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("jpeg"))), "image/jpeg", 0.86);
  });
  return { jpeg: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}

function wrapText(text: string, width = 86) {
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
      if (next.length > width) {
        if (line) lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
  }
  return lines;
}

function imageKey(src: string, edit: string) {
  return `${src}\0${edit}`;
}

function editOf(node: HTMLElement) {
  return node.getAttribute("data-edit-style") || "";
}

function flowPieces(root: HTMLElement, images: Map<string, PdfImage>): PdfPiece[] {
  const pieces: PdfPiece[] = [];
  let buf = "";
  const blocks = new Set(["P", "DIV", "H1", "H2", "H3", "H4", "LI", "TR", "BLOCKQUOTE", "PRE", "SECTION", "UL", "OL", "TABLE"]);

  function flush() {
    if (!buf.trim() && !buf.includes("\n")) {
      buf = "";
      return;
    }
    const lines = wrapText(buf);
    buf = "";
    if (lines.length) pieces.push({ kind: "lines", lines });
  }

  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      buf += node.textContent || "";
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.tagName === "SCRIPT" || node.tagName === "STYLE") return;
    if (node.tagName === "BR") {
      buf += "\n";
      return;
    }
    if (node.tagName === "IMG") {
      flush();
      const src = node.getAttribute("src") || "";
      const img = images.get(imageKey(src, editOf(node)));
      if (img) pieces.push({ kind: "image", img });
      return;
    }
    if (node.hasAttribute("data-quire-sheet")) {
      flush();
      pieces.push({ kind: "sheet" });
      return;
    }
    const block = blocks.has(node.tagName);
    if (block && buf && !buf.endsWith("\n")) buf += "\n";
    node.childNodes.forEach(walk);
    if (block && buf && !buf.endsWith("\n")) buf += "\n";
  }

  root.childNodes.forEach(walk);
  flush();
  return pieces;
}

export async function buildPdf(
  title: string,
  html: string,
  opts?: { grayscaleImages?: boolean; pageWidth?: number; pageHeight?: number },
) {
  const imageBySrc = new Map<string, PdfImage>();
  const parsed = new DOMParser().parseFromString(`<div id="quire-pdf">${html}</div>`, "text/html");
  const root = parsed.getElementById("quire-pdf") ?? parsed.body;
  for (const node of root.querySelectorAll("img")) {
    const src = node.getAttribute("src") || "";
    const edit = editOf(node);
    const key = imageKey(src, edit);
    if (!src || imageBySrc.has(key)) continue;
    try {
      const got = await jpegFromSrc(src, Boolean(opts?.grayscaleImages), edit);
      if (got) imageBySrc.set(key, { key, src, ...got });
    } catch {
      /* skip a picture that will not decode */
    }
  }

  const pieces: PdfPiece[] = [];
  if (title.trim()) pieces.push({ kind: "lines", lines: [...wrapText(title.trim()), ""] });
  pieces.push(...flowPieces(root, imageBySrc));

  const pageW = Math.max(216, Math.round((Number(opts?.pageWidth) > 0 ? Number(opts?.pageWidth) : 8.5) * 72));
  const pageH = Math.max(216, Math.round((Number(opts?.pageHeight) > 0 ? Number(opts?.pageHeight) : 11) * 72));
  const margin = 72;
  const leading = 16;
  const usable = pageH - margin * 2;

  type Page = { commands: string; xobjects: PdfXRef[] };
  const pages: Page[] = [];
  let commands = "";
  let used = 0;
  const xobjects: PdfXRef[] = [];
  let imageSerial = 0;

  function flush(force = false) {
    if (!force && !commands) return;
    pages.push({ commands, xobjects: [...xobjects] });
    commands = "";
    used = 0;
    xobjects.length = 0;
  }

  function ensure(height: number) {
    if (used + height > usable && commands) flush();
  }

  function drawLines(lines: string[]) {
    for (const line of lines) {
      ensure(leading);
      const y = pageH - margin - used - 12;
      commands += `BT /F1 12 Tf ${margin} ${y.toFixed(2)} Td (${pdfEscape(line)}) Tj ET\n`;
      used += leading;
    }
  }

  function drawImage(img: PdfImage) {
    const maxW = pageW - margin * 2;
    const natW = img.width * (72 / 96);
    const natH = img.height * (72 / 96);
    const fit = natW > maxW ? maxW / natW : 1;
    const drawW = natW * fit;
    const drawH = natH * fit;
    ensure(drawH + 16);
    const name = `Im${(imageSerial += 1)}`;
    xobjects.push({ name, key: img.key });
    const y = pageH - margin - used - drawH;
    commands += `q ${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${margin} ${Math.max(margin, y).toFixed(2)} cm /${name} Do Q\n`;
    used += drawH + 12;
  }

  let afterSheet = false;
  for (const piece of pieces) {
    if (piece.kind === "sheet") {
      flush(true);
      afterSheet = true;
    } else if (piece.kind === "lines") {
      afterSheet = false;
      drawLines(piece.lines);
    } else {
      afterSheet = false;
      drawImage(piece.img);
    }
  }
  if (commands || afterSheet) flush(true);
  if (!pages.length) pages.push({ commands: "BT /F1 12 Tf 72 720 Td ( ) Tj ET\n", xobjects: [] });

  const objs: (string | Uint8Array)[] = ["", "<< /Type /Catalog /Pages 2 0 R >>", ""];
  const fontId = 3;
  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>");

  const srcToId = new Map<string, number>();
  for (const page of pages) {
    for (const ref of page.xobjects) {
      if (srcToId.has(ref.key)) continue;
      const img = imageBySrc.get(ref.key);
      if (!img) continue;
      const id = objs.length;
      srcToId.set(ref.key, id);
      const header = str(
        `<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.jpeg.length} >>\nstream\n`,
      );
      objs.push(concat([header, img.jpeg, str("\nendstream")]));
    }
  }

  const pageIds: number[] = [];
  for (const page of pages) {
    const contentId = objs.length;
    const body = winAnsi(page.commands);
    objs.push(concat([str(`<< /Length ${body.length} >>\nstream\n`), body, str("endstream")]));
    const xobj = page.xobjects
      .map((ref) => {
        const id = srcToId.get(ref.key);
        return id ? `/${ref.name} ${id} 0 R` : "";
      })
      .filter(Boolean)
      .join(" ");
    const pageId = objs.length;
    pageIds.push(pageId);
    objs.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> /XObject << ${xobj} >> >> >>`,
    );
  }
  objs[2] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`;

  const chunks: Uint8Array[] = [str("%PDF-1.4\n")];
  const offsets = [0];
  let size = chunks[0].length;
  for (let i = 1; i < objs.length; i += 1) {
    offsets[i] = size;
    const body = typeof objs[i] === "string" ? str(`${i} 0 obj\n${objs[i]}\nendobj\n`) : concat([str(`${i} 0 obj\n`), objs[i] as Uint8Array, str("\nendobj\n")]);
    chunks.push(body);
    size += body.length;
  }
  let xref = `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objs.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer << /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${size}\n%%EOF`;
  chunks.push(str(xref));
  return concat(chunks);
}
