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

async function inflateRaw(packed: Uint8Array, cap: number): Promise<Uint8Array> {
  if (typeof DecompressionStream !== "function") return new Uint8Array();
  const stream = new Blob([packed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const step = await reader.read();
      if (step.done) break;
      const value = step.value;
      if (!value?.byteLength) continue;
      total += value.byteLength;
      if (total > cap) {
        await reader.cancel().catch(() => undefined);
        throw new Error("That zip is too large to open.");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof Error && error.message === "That zip is too large to open.") throw error;
    throw new Error("That zip could not be read.");
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

const MAX_ZIP_BYTES = 40_000_000;
const MAX_ZIP_FILES = 80;

type ZipEntry = { name: string; method: number; compSize: number; dataStart: number };

function unsafeZipName(name: string) {
  return !name || name.includes("\0") || name.includes("..") || name.startsWith("/") || name.startsWith("\\") || name.includes("\\");
}

function findEocd(view: DataView) {
  const len = view.byteLength;
  if (len < 22) return -1;
  const start = Math.max(0, len - 22 - 65535);
  for (let i = len - 22; i >= start; i -= 1) {
    if (view.getUint32(i, true) !== 0x06054b50) continue;
    const comment = view.getUint16(i + 20, true);
    if (i + 22 + comment === len) return i;
  }
  return -1;
}

function readCentral(view: DataView, bytes: Uint8Array): ZipEntry[] | null {
  const eocd = findEocd(view);
  if (eocd < 0) return null;
  const count = view.getUint16(eocd + 10, true);
  const size = view.getUint32(eocd + 12, true);
  const offset = view.getUint32(eocd + 16, true);
  if (count > MAX_ZIP_FILES) throw new Error("That zip has too many files.");
  if (size === 0xffffffff || offset === 0xffffffff) throw new Error("That zip could not be read.");
  if (offset + size > bytes.length) throw new Error("That zip could not be read.");
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
  let p = offset;
  const end = offset + size;
  while (entries.length < count) {
    if (p + 46 > end || view.getUint32(p, true) !== 0x02014b50) throw new Error("That zip could not be read.");
    const flags = view.getUint16(p + 8, true);
    const method = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);
    if (p + 46 + nameLen > bytes.length) throw new Error("That zip could not be read.");
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    if (flags & 0x1) throw new Error("That zip could not be read.");
    if (localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== 0x04034b50) {
      throw new Error("That zip could not be read.");
    }
    const localName = view.getUint16(localOffset + 26, true);
    const localExtra = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localName + localExtra;
    if (compSize > MAX_ZIP_BYTES || dataStart + compSize > bytes.length) throw new Error("That zip is too large to open.");
    entries.push({ name, method, compSize, dataStart });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function readLocal(view: DataView, bytes: Uint8Array): ZipEntry[] {
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
  let i = 0;
  while (i + 30 <= bytes.length && view.getUint32(i, true) === 0x04034b50) {
    if (entries.length >= MAX_ZIP_FILES) throw new Error("That zip has too many files.");
    const flags = view.getUint16(i + 6, true);
    const method = view.getUint16(i + 8, true);
    const compSize = view.getUint32(i + 18, true);
    const nameLen = view.getUint16(i + 26, true);
    const extraLen = view.getUint16(i + 28, true);
    if (i + 30 + nameLen > bytes.length) throw new Error("That zip could not be read.");
    const name = decoder.decode(bytes.subarray(i + 30, i + 30 + nameLen));
    const dataStart = i + 30 + nameLen + extraLen;
    if (flags & 0x1) throw new Error("That zip could not be read.");
    if (flags & 0x08 && !compSize) throw new Error("That zip could not be read.");
    if (compSize > MAX_ZIP_BYTES || dataStart + compSize > bytes.length) throw new Error("That zip is too large to open.");
    let descriptor = 0;
    if (flags & 0x08) {
      const after = dataStart + compSize;
      const sig = after + 4 <= bytes.length ? view.getUint32(after, true) : 0;
      descriptor = sig === 0x08074b50 ? 16 : 12;
    }
    entries.push({ name, method, compSize, dataStart });
    i = dataStart + compSize + descriptor;
  }
  return entries;
}

export async function unzip(buffer: ArrayBuffer) {
  if (buffer.byteLength > MAX_ZIP_BYTES) {
    throw new Error("That zip is too large to open.");
  }
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const entries = readCentral(view, bytes) ?? readLocal(view, bytes);
  const files = new Map<string, string>();
  const decoder = new TextDecoder();
  let total = 0;
  for (const entry of entries) {
    if (unsafeZipName(entry.name) || entry.name.endsWith("/")) continue;
    if (files.size >= MAX_ZIP_FILES) throw new Error("That zip has too many files.");
    const packed = bytes.subarray(entry.dataStart, entry.dataStart + entry.compSize);
    let raw = new Uint8Array();
    if (entry.method === 0) raw = packed;
    else if (entry.method === 8) raw = await inflateRaw(packed, MAX_ZIP_BYTES - total);
    total += raw.byteLength;
    if (total > MAX_ZIP_BYTES) throw new Error("That zip is too large to open.");
    files.set(entry.name, decoder.decode(raw));
  }
  return files;
}
