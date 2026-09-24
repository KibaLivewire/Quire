function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc ^= data[i];
    for (let n = 0; n < 8; n += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function u32(value: number) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function concat(parts: Uint8Array[]) {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function zipStore(files: { name: string; data: Uint8Array }[]) {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  const encoder = new TextEncoder();

  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const local = concat([
      u32(0x04034b50),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(file.data.length),
      u32(file.data.length),
      u16(name.length),
      u16(0),
      name,
      file.data,
    ]);
    locals.push(local);
    centrals.push(
      concat([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0x0800),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(file.data.length),
        u32(file.data.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        name,
      ]),
    );
    offset += local.length;
  }

  const central = concat(centrals);
  const end = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(central.length),
    u32(offset),
    u16(0),
  ]);
  return new Blob([concat([...locals, central, end])], { type: "application/zip" });
}

export async function unzip(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const files = new Map<string, string>();
  const decoder = new TextDecoder();
  let i = 0;
  while (i + 30 <= bytes.length && view.getUint32(i, true) === 0x04034b50) {
    const flags = view.getUint16(i + 6, true);
    const method = view.getUint16(i + 8, true);
    let compact = view.getUint32(i + 18, true);
    const nameLen = view.getUint16(i + 26, true);
    const extraLen = view.getUint16(i + 28, true);
    const name = decoder.decode(bytes.subarray(i + 30, i + 30 + nameLen));
    const dataStart = i + 30 + nameLen + extraLen;
    let descriptor = 0;
    if (flags & 0x08) {
      if (!compact) {
        let scan = dataStart;
        while (scan + 4 <= bytes.length) {
          const sig = view.getUint32(scan, true);
          if (sig === 0x08074b50 || sig === 0x04034b50 || sig === 0x02014b50) break;
          scan += 1;
        }
        const sig = scan + 4 <= bytes.length ? view.getUint32(scan, true) : 0;
        if (sig === 0x08074b50 && scan + 16 <= bytes.length) {
          compact = Math.max(0, scan - dataStart);
          descriptor = 16;
        } else if (sig === 0x04034b50 || sig === 0x02014b50) {
          compact = Math.max(0, scan - dataStart - 12);
          descriptor = 12;
        } else {
          const rest = Math.max(0, bytes.length - dataStart);
          compact = rest >= 12 ? rest - 12 : rest;
          descriptor = rest >= 12 ? 12 : 0;
        }
      } else {
        const after = dataStart + compact;
        const sig = after + 4 <= bytes.length ? view.getUint32(after, true) : 0;
        descriptor = sig === 0x08074b50 ? 16 : 12;
      }
    }
    const packed = bytes.subarray(dataStart, dataStart + compact);
    let text = "";
    if (method === 0) {
      text = decoder.decode(packed);
    } else if (method === 8 && typeof DecompressionStream === "function") {
      const stream = new Blob([packed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      text = await new Response(stream).text();
    }
    files.set(name, text);
    i = dataStart + compact + descriptor;
  }
  return files;
}
