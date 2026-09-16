import { plainText } from "./utils";

type PdfImage = { id: number; width: number; height: number; jpeg: Uint8Array };

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

async function jpegFromSrc(src: string, grayscale: boolean): Promise<{ jpeg: Uint8Array; width: number; height: number } | null> {
  if (!src.startsWith("data:image")) return null;
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  const max = 1600;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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

export async function buildPdf(title: string, html: string, opts?: { grayscaleImages?: boolean }) {
  const images: { src: string; jpeg: Uint8Array; width: number; height: number }[] = [];
  const seen = new Set<string>();
  const srcs = [...html.matchAll(/<img[^>]+src="([^"]+)"/gi)].map((m) => m[1]);
  for (const src of srcs) {
    if (seen.has(src)) continue;
    seen.add(src);
    try {
      const got = await jpegFromSrc(src, Boolean(opts?.grayscaleImages));
      if (got) images.push({ src, ...got });
    } catch {
      /* skip */
    }
  }

  const text = `${title}\n\n${plainText(html)}`;
  const lines = wrapText(text);
  const pageW = 612;
  const pageH = 792;
  const margin = 72;
  const leading = 16;
  const usable = pageH - margin * 2;
  const lineCap = Math.floor(usable / leading);

  type Block = { kind: "text"; lines: string[] } | { kind: "image"; img: (typeof images)[0] };
  const blocks: Block[] = [{ kind: "text", lines }];
  for (const img of images) blocks.push({ kind: "image", img });

  type Page = { commands: string; xobjects: string[] };
  const pages: Page[] = [];
  let commands = "";
  let used = 0;
  const xobjects: string[] = [];

  function flush() {
    pages.push({ commands, xobjects: [...xobjects] });
    commands = "";
    used = 0;
    xobjects.length = 0;
  }

  function ensure(height: number) {
    if (used + height > usable && commands) flush();
  }

  if (blocks[0]?.kind === "text") {
    const chunk = blocks[0].lines;
    for (let i = 0; i < chunk.length; i += lineCap) {
      const slice = chunk.slice(i, i + lineCap);
      ensure(slice.length * leading);
      const startY = pageH - margin - used - 12;
      commands += `BT /F1 12 Tf ${margin} ${startY} Td ${leading} TL (${pdfEscape(slice[0] ?? "")}) Tj\n`;
      commands += slice.slice(1).map((line) => `T* (${pdfEscape(line)}) Tj`).join("\n");
      commands += "\nET\n";
      used += slice.length * leading;
    }
  }

  for (const block of blocks) {
    if (block.kind !== "image") continue;
    const maxW = pageW - margin * 2;
    const scale = Math.min(1, maxW / block.img.width);
    const w = block.img.width * scale;
    const h = block.img.height * scale * (72 / 96);
    const drawW = w * (72 / 96);
    ensure(drawW > 0 ? h + 16 : 80);
    const name = `Im${xobjects.length + 1}`;
    xobjects.push(name);
    const y = pageH - margin - used - h;
    commands += `q ${drawW.toFixed(2)} 0 0 ${h.toFixed(2)} ${margin} ${Math.max(margin, y).toFixed(2)} cm /${name} Do Q\n`;
    used += h + 12;
  }
  if (commands) flush();
  if (!pages.length) pages.push({ commands: "BT /F1 12 Tf 72 720 Td ( ) Tj ET\n", xobjects: [] });

  const objs: (string | Uint8Array)[] = ["", "<< /Type /Catalog /Pages 2 0 R >>", ""];
  const fontId = 3;
  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>");

  const imgObjIds: number[] = [];
  const imgByName: Record<string, number> = {};
  let imgIndex = 0;
  for (const page of pages) {
    for (const name of page.xobjects) {
      if (imgByName[name]) continue;
      const img = images[imgIndex];
      imgIndex += 1;
      if (!img) continue;
      const id = objs.length;
      imgObjIds.push(id);
      imgByName[name] = id;
      const header = str(
        `<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.jpeg.length} >>\nstream\n`,
      );
      objs.push(concat([header, img.jpeg, str("\nendstream")]));
    }
  }

  const pageIds: number[] = [];
  for (const page of pages) {
    const contentId = objs.length;
    objs.push(`<< /Length ${page.commands.length} >>\nstream\n${page.commands}endstream`);
    const xobj = page.xobjects
      .map((name) => {
        const id = imgByName[name];
        return id ? `/${name} ${id} 0 R` : "";
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
