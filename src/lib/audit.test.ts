import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";
import { crc32, deflateRawSync } from "node:zlib";
import { findHits, nonOverlappingHits } from "./find.ts";
import { folderBytes, folderUpdated } from "./folders.ts";
import { importDocument } from "./import-note.ts";
import { clearLockFailures, hashPin, lockWaitMs, pinMatches, recordLockFailure } from "./lock.ts";
import { isHttpUrl, isOpenableUrl, isStoredLink, sameDeskOrigin } from "./open-url.ts";
import { coercePages, replaceExistingPage } from "./page-write.ts";
import { buildPdf } from "./pdf.ts";
import { readFileSync } from "node:fs";
import { sanitizeEditStyle, sanitizeInlineStyle, sanitizePluginCss, presentationalUrl } from "./sanitize-html.ts";
import { plainText, decodeTextEntities, foldDeskText } from "./utils.ts";
import { unzip, zipStore } from "./zip.ts";
import { lookupWord } from "./word-tools.ts";

const require = createRequire(import.meta.url);
const { oneExternalUrl, sameDeskOrigin: shellSameDesk } = require("../../electron/open-url.cjs") as {
  oneExternalUrl: (value: string) => string | null;
  sameDeskOrigin: (next: string, home: string) => boolean;
};

type FakeNode = {
  isText?: boolean;
  text?: string;
  isBlock?: boolean;
  isLeaf?: boolean;
  isTextblock?: boolean;
  type?: { name?: string };
};

function fakeDoc(nodes: FakeNode[]) {
  return {
    content: { size: 1000 },
    nodesBetween(_from: number, _to: number, fn: (node: FakeNode, pos: number) => void) {
      let pos = 1;
      for (const node of nodes) {
        fn(node, pos);
        pos += node.isText && node.text ? node.text.length : 1;
      }
    },
  };
}

function u16(value: number) {
  const bytes = Buffer.alloc(2);
  bytes.writeUInt16LE(value);
  return bytes;
}

function u32(value: number) {
  const bytes = Buffer.alloc(4);
  bytes.writeUInt32LE(value >>> 0);
  return bytes;
}

function fileEntry(name: string, raw: Buffer, packed: Buffer, method: number, descriptor: boolean) {
  const nameBuf = Buffer.from(name);
  const flags = 0x0800 | (descriptor ? 0x0008 : 0);
  const sum = crc32(raw) >>> 0;
  const local = Buffer.concat([
    u32(0x04034b50),
    u16(20),
    u16(flags),
    u16(method),
    u16(0),
    u16(0),
    u32(descriptor ? 0 : sum),
    u32(descriptor ? 0 : packed.length),
    u32(descriptor ? 0 : raw.length),
    u16(nameBuf.length),
    u16(0),
    nameBuf,
    packed,
    descriptor ? Buffer.concat([u32(0x08074b50), u32(sum), u32(packed.length), u32(raw.length)]) : Buffer.alloc(0),
  ]);
  return { local, nameBuf, flags, method, sum, compSize: packed.length, rawSize: raw.length };
}

function zipBytes(entries: ReturnType<typeof fileEntry>[]) {
  let offset = 0;
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  for (const entry of entries) {
    locals.push(entry.local);
    centrals.push(
      Buffer.concat([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(entry.flags),
        u16(entry.method),
        u16(0),
        u16(0),
        u32(entry.sum),
        u32(entry.compSize),
        u32(entry.rawSize),
        u16(entry.nameBuf.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        entry.nameBuf,
      ]),
    );
    offset += entry.local.length;
  }
  const central = Buffer.concat(centrals);
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(central.length),
    u32(offset),
    u16(0),
  ]);
  return Buffer.concat([...locals, central, end]);
}

describe("sheet saves", () => {
  it("replaces a sheet that exists and does not grow the notebook", () => {
    const pages = ["one", "two"];
    assert.deepEqual(replaceExistingPage(pages, 1, "two more"), ["one", "two more"]);
    assert.equal(replaceExistingPage(pages, 2, "three"), null);
    assert.equal(replaceExistingPage(pages, -1, "no"), null);
    assert.equal(replaceExistingPage(pages, 1.5, "no"), null);
    assert.equal(replaceExistingPage(pages, Number.NaN, "no"), null);
    assert.deepEqual(pages, ["one", "two"]);
  });
});

describe("find", () => {
  it("keeps a line break on the open sheet", () => {
    const broken = fakeDoc([
      { isBlock: true, isTextblock: true },
      { isText: true, text: "hello" },
      { type: { name: "hardBreak" } },
      { isText: true, text: "world" },
    ]);
    assert.equal(findHits(broken, "helloworld").length, 0);
    assert.equal(findHits(broken, "hello").length, 1);
    assert.equal(findHits(broken, "world").length, 1);
    assert.equal(findHits(broken, "hello\nworld").length, 1);
  });

  it("counts the same break between paragraphs, and still overlaps", () => {
    const blocks = fakeDoc([
      { isBlock: true, isTextblock: true },
      { isText: true, text: "hello" },
      { isBlock: true, isTextblock: true },
      { isText: true, text: "world" },
    ]);
    assert.equal(findHits(blocks, "helloworld").length, 0);
    assert.equal(findHits(blocks, "hello\nworld").length, 1);
    const run = fakeDoc([{ isBlock: true, isTextblock: true }, { isText: true, text: "aaaa" }]);
    const hits = findHits(run, "aa");
    assert.equal(hits.length, 3);
    assert.equal(nonOverlappingHits(hits).length, 2);
  });
});

describe("zip", () => {
  it("does not stop at a lookalike header, and keeps the next file", async () => {
    const noisy = Buffer.concat([
      Buffer.from("HELLO"),
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.from("WORLD"),
      Buffer.from([0x50, 0x4b, 0x07, 0x08]),
      Buffer.from("TAIL"),
    ]);
    const bytes = zipBytes([
      fileEntry("a.txt", noisy, noisy, 0, true),
      fileEntry("word/document.xml", Buffer.from("kept"), Buffer.from("kept"), 0, false),
      fileEntry("../secret", Buffer.from("nope"), Buffer.from("nope"), 0, false),
      fileEntry("a\\b.txt", Buffer.from("nope"), Buffer.from("nope"), 0, false),
    ]);
    const files = await unzip(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    assert.equal(files.get("a.txt"), "HELLOPK\u0003\u0004WORLDPK\u0007\u0008TAIL");
    assert.equal(files.get("word/document.xml"), "kept");
    assert.equal(files.has("../secret"), false);
    assert.equal(files.has("a\\b.txt"), false);
  });

  it("round-trips a stored backup and a deflated file", async () => {
    const blob = zipStore([{ name: "quire.json", data: new TextEncoder().encode('{"app":"quire"}') }]);
    const stored = await unzip(await blob.arrayBuffer());
    assert.equal(stored.get("quire.json"), '{"app":"quire"}');
    const raw = Buffer.from("hello word ".repeat(200));
    const packed = deflateRawSync(raw);
    const bytes = zipBytes([fileEntry("note.txt", raw, packed, 8, false)]);
    const files = await unzip(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    assert.equal(files.get("note.txt"), raw.toString());
  });

  it("stops at 80 files and at 40 MB inflated", async () => {
    const many = Array.from({ length: 81 }, (_, i) => ({
      name: `f${i}.txt`,
      data: new TextEncoder().encode("x"),
    }));
    await assert.rejects(unzip(await (await zipStore(many)).arrayBuffer()), /too many files/);
    const eighty = many.slice(0, 80);
    const ok = await unzip(await (await zipStore(eighty)).arrayBuffer());
    assert.equal(ok.size, 80);
    const raw = Buffer.alloc(40_000_001, 0x61);
    const packed = deflateRawSync(raw);
    const bomb = zipBytes([fileEntry("big.txt", raw, packed, 8, false)]);
    await assert.rejects(
      unzip(bomb.buffer.slice(bomb.byteOffset, bomb.byteOffset + bomb.byteLength)),
      /too large/,
    );
    const huge = Buffer.alloc(40_000_001);
    await assert.rejects(unzip(huge.buffer.slice(huge.byteOffset, huge.byteOffset + huge.byteLength)), /too large/);
  });
});

describe("word import", () => {
  it("keeps an emoji and drops a null, a surrogate, and a code that is not a character", async () => {
    const xml = `<w:document><w:p><w:t>Hi &#128512;&#0;&#xD800;&#1114112; & ok</w:t></w:p></w:document>`;
    const blob = zipStore([{ name: "word/document.xml", data: new TextEncoder().encode(xml) }]);
    const file = new File([await blob.arrayBuffer()], "note.docx");
    const got = await importDocument(file);
    assert.equal(got.html.includes("\u{1F600}"), true);
    assert.equal(got.html.includes("\uF600"), false);
    assert.equal(got.html.includes("\0"), false);
    assert.equal(got.html.includes("&"), true);
    const tabbed = `<w:document><w:p><w:r><w:t>hello</w:t></w:r><w:r><w:tab/></w:r><w:r><w:t>world</w:t><w:br/><w:t>next</w:t></w:r><w:del><w:r><w:t>gone</w:t></w:r></w:del><w:r><w:instrText>PAGE</w:instrText></w:r></w:p></w:document>`;
    const tabBlob = zipStore([{ name: "word/document.xml", data: new TextEncoder().encode(tabbed) }]);
    const tabbedFile = new File([await tabBlob.arrayBuffer()], "tab.docx");
    const opened = await importDocument(tabbedFile);
    assert.match(opened.html, /hello world/);
    assert.match(opened.html, /hello world<br>next/);
    assert.equal(opened.html.includes("gone"), false);
    assert.equal(opened.html.includes("PAGE"), false);
    const rtf = new File(["{\\rtf1 A\\u0 ?B\\u-10179?\\u-8704?}"], "note.rtf");
    const text = await importDocument(rtf);
    assert.equal(text.html.includes("\0"), false);
    assert.equal(text.html.includes("A"), true);
    assert.equal(text.html.includes("B"), true);
    assert.equal(text.html.includes("\u{1F600}"), true);
    const picture = new File(["{\\rtf1 Keep {\\pict\\bin6 }}LOST}End}"], "pic.rtf");
    const kept = await importDocument(picture);
    assert.match(kept.html, /Keep/);
    assert.match(kept.html, /End/);
    assert.equal(kept.html.includes("LOST"), false);
    const grouped = new File(["{\\rtf1{\\uc0 }Hi \\u233 ?}"], "group.rtf");
    const restored = await importDocument(grouped);
    assert.match(restored.html, /Hi é/);
    assert.equal(restored.html.includes("é?"), false);
    const paired = `<w:document><w:p><w:r><w:t>hello</w:t></w:r><w:r><w:tab></w:tab></w:r><w:r><w:t>world</w:t><w:br></w:br><w:t>next</w:t></w:r></w:p></w:document>`;
    const pairedBlob = zipStore([{ name: "word/document.xml", data: new TextEncoder().encode(paired) }]);
    const pairedFile = new File([await pairedBlob.arrayBuffer()], "pair.docx");
    const pairedOpen = await importDocument(pairedFile);
    assert.match(pairedOpen.html, /hello world<br>next/);
    const boxed = `<w:document><w:p><w:r><w:t>before</w:t></w:r><w:r><w:drawing><w:txbxContent><w:p><w:r><w:t>inside</w:t></w:r></w:p></w:txbxContent></w:drawing></w:r><w:r><w:t>after</w:t></w:r></w:p><w:p><w:r><w:t>next</w:t></w:r></w:p></w:document>`;
    const boxedBlob = zipStore([{ name: "word/document.xml", data: new TextEncoder().encode(boxed) }]);
    const boxedFile = new File([await boxedBlob.arrayBuffer()], "box.docx");
    const boxedOpen = await importDocument(boxedFile);
    assert.match(boxedOpen.html, /before inside after/);
    assert.match(boxedOpen.html, /<p>next<\/p>/);
    const alt = `<w:document><w:p><w:r><mc:AlternateContent><mc:Choice><w:drawing><w:txbxContent><w:p><w:r><w:t>Inside</w:t></w:r></w:p></w:txbxContent></w:drawing></mc:Choice><mc:Fallback><w:pict><w:txbxContent><w:p><w:r><w:t>Inside</w:t></w:r></w:p></w:txbxContent></w:pict></mc:Fallback></mc:AlternateContent></w:r></w:p><w:p><w:r><w:t>After</w:t></w:r></w:p></w:document>`;
    const altBlob = zipStore([{ name: "word/document.xml", data: new TextEncoder().encode(alt) }]);
    const altOpen = await importDocument(new File([await altBlob.arrayBuffer()], "alt.docx"));
    assert.equal((altOpen.html.match(/Inside/g) || []).length, 1);
    assert.match(altOpen.html, /<p>After<\/p>/);
    const onlyFallback = `<w:document><w:p><w:r><mc:AlternateContent><mc:Fallback><w:txbxContent><w:p><w:r><w:t>Only</w:t></w:r></w:p></w:txbxContent></mc:Fallback></mc:AlternateContent></w:r><w:r><w:t>After</w:t></w:r></w:p></w:document>`;
    const onlyBlob = zipStore([{ name: "word/document.xml", data: new TextEncoder().encode(onlyFallback) }]);
    const onlyOpen = await importDocument(new File([await onlyBlob.arrayBuffer()], "only.docx"));
    assert.match(onlyOpen.html, /Only After/);
    const hyphens = `<w:document><w:p><w:r><w:t>well</w:t></w:r><w:r><w:softHyphen/></w:r><w:r><w:t>known</w:t></w:r><w:r><w:noBreakHyphen></w:noBreakHyphen></w:r><w:r><w:t>word</w:t></w:r></w:p></w:document>`;
    const hyphenBlob = zipStore([{ name: "word/document.xml", data: new TextEncoder().encode(hyphens) }]);
    const hyphenOpen = await importDocument(new File([await hyphenBlob.arrayBuffer()], "hyphen.docx"));
    assert.equal(hyphenOpen.html.includes("wellknownword"), false);
    assert.match(hyphenOpen.html, /well\u00adknown-word/);
    const marked = `<w:document><w:p><w:r><w:t>Chapter</w:t></w:r><w:r><w:ptab w:alignment="right" w:relativeTo="margin" w:leader="dot"/></w:r><w:r><w:t>12</w:t></w:r></w:p><w:p><w:r><w:t>hello</w:t></w:r><w:r><w:sym w:font="Symbol" w:char="00A0"/></w:r><w:r><w:t>world</w:t></w:r><w:r><w:separator/></w:r><w:r><w:t>note</w:t></w:r></w:p></w:document>`;
    const markedBlob = zipStore([{ name: "word/document.xml", data: new TextEncoder().encode(marked) }]);
    const markedOpen = await importDocument(new File([await markedBlob.arrayBuffer()], "mark.docx"));
    assert.match(markedOpen.html, /Chapter 12/);
    assert.equal(markedOpen.html.includes("Chapter12"), false);
    assert.equal(markedOpen.html.includes("helloworld"), false);
    assert.match(markedOpen.html, /hello\u00a0world note/);
    const rtfMarks = new File(["{\\rtf1 hello\\endash world\\emdash more\\~gap well\\-known well\\_known say \\ldblquote hi\\rdblquote\\bullet now\\page next\\enspace far}"], "marks.rtf");
    const rtfOpen = await importDocument(rtfMarks);
    assert.equal(rtfOpen.html.includes("helloworld"), false);
    assert.match(rtfOpen.html, /hello\u2013world\u2014more/);
    assert.match(rtfOpen.html, /hello\u2013world\u2014more\u00a0gap/);
    assert.match(rtfOpen.html, /well\u00adknown well-known/);
    assert.equal(rtfOpen.html.includes("well_known"), false);
    assert.match(rtfOpen.html, /say \u201chi\u201d\u2022now/);
    assert.match(rtfOpen.html, /now<br>next/);
    assert.equal(rtfOpen.html.includes("nextfar"), false);
    const emptyChoice = `<w:document><w:p><w:r><mc:AlternateContent><mc:Choice Requires="wps"></mc:Choice><mc:Fallback><w:t>Only</w:t></mc:Fallback></mc:AlternateContent></w:r><w:r><w:t>After</w:t></w:r></w:p></w:document>`;
    const emptyBlob = zipStore([{ name: "word/document.xml", data: new TextEncoder().encode(emptyChoice) }]);
    const emptyOpen = await importDocument(new File([await emptyBlob.arrayBuffer()], "empty.docx"));
    assert.match(emptyOpen.html, /Only/);
    assert.match(emptyOpen.html, /After/);
    const column = new File(["{\\rtf1 hello\\column world\\sect next}"], "break.rtf");
    const columnOpen = await importDocument(column);
    assert.equal(columnOpen.html.includes("helloworld"), false);
    assert.equal(columnOpen.html.includes("worldnext"), false);
    assert.match(columnOpen.html, /hello<br>world<br>next/);
    const broken = `<w:document><w:p><w:r><w:t>hello</w:t></w:r><w:r><w:lastRenderedPageBreak/></w:r><w:r><w:t>world</w:t></w:r></w:p></w:document>`;
    const brokenBlob = zipStore([{ name: "word/document.xml", data: new TextEncoder().encode(broken) }]);
    const brokenOpen = await importDocument(new File([await brokenBlob.arrayBuffer()], "break.docx"));
    assert.equal(brokenOpen.html.includes("helloworld"), false);
    assert.match(brokenOpen.html, /hello<br>world/);
    const cell = new File(["{\\rtf1 hello\\cell world\\row next\\nestcell far}"], "cell.rtf");
    const cellOpen = await importDocument(cell);
    assert.equal(cellOpen.html.includes("helloworld"), false);
    assert.equal(cellOpen.html.includes("nextfar"), false);
    assert.match(cellOpen.html, /hello<br>world<br>next<br>far/);
    const quoted = new File(["{\\rtf1\\ansi\\ansicpg1252 it\\'92s \\'93Hi\\'94 \\'96 dash \\'80}"], "cp.rtf");
    const quotedOpen = await importDocument(quoted);
    assert.match(quotedOpen.html, /it\u2019s \u201cHi\u201d \u2013 dash \u20ac/);
    assert.equal(quotedOpen.html.includes("it\u0092s"), false);
    const utf = new File(["{\\rtf1\\ansi\\ansicpg65001 caf\\'c3\\'a9}"], "utf.rtf");
    const utfOpen = await importDocument(utf);
    assert.match(utfOpen.html, /caf\u00e9/);
    const wide = new File(["{\\rtf1 A\\u128512?B}"], "wide.rtf");
    const wideOpen = await importDocument(wide);
    assert.equal(wideOpen.html.includes("A\u{1F600}B"), true);
    assert.equal(wideOpen.html.includes("\u{1F600}?"), false);
    const soft = new File(["{\\rtf1 hello\\softline world\\softpage next\\softcol far}"], "soft.rtf");
    const softOpen = await importDocument(soft);
    assert.equal(softOpen.html.includes("helloworld"), false);
    assert.equal(softOpen.html.includes("nextfar"), false);
    assert.match(softOpen.html, /hello<br>world<br>next<br>far/);
    const wrapped = new File(["{\\rtf1 hel\nlo}"], "wrap.rtf");
    const wrappedOpen = await importDocument(wrapped);
    assert.match(wrappedOpen.html, /hello/);
    assert.equal(wrappedOpen.html.includes("hel<br>"), false);
    assert.equal(wrappedOpen.html.includes("hel lo"), false);
    const joined = new File(["{\\rtf1 a\\\nb}"], "par.rtf");
    const joinedOpen = await importDocument(joined);
    assert.match(joinedOpen.html, /a<br>b/);
    const wrapBreak = new File(["{\\rtf1 hello\\lbr1 world\\lbr next}"], "lbr.rtf");
    const wrapBreakOpen = await importDocument(wrapBreak);
    assert.equal(wrapBreakOpen.html.includes("helloworld"), false);
    assert.equal(wrapBreakOpen.html.includes("worldnext"), false);
    assert.match(wrapBreakOpen.html, /hello<br>world<br>next/);
    const noted = `<w:document><w:p><w:r><w:t>hello</w:t></w:r><w:r><w:footnoteReference w:id="1"/></w:r><w:r><w:t>world</w:t></w:r></w:p><w:p><w:r><w:t>see</w:t></w:r><w:r><w:endnoteReference w:id="2"></w:endnoteReference></w:r><w:r><w:t>note</w:t></w:r></w:p></w:document>`;
    const notedOpen = await importDocument(new File([await (await zipStore([{ name: "word/document.xml", data: new TextEncoder().encode(noted) }])).arrayBuffer()], "note-ref.docx"));
    assert.equal(notedOpen.html.includes("helloworld"), false);
    assert.equal(notedOpen.html.includes("seenote"), false);
    assert.match(notedOpen.html, /hello world/);
    assert.match(notedOpen.html, /see note/);
    assert.equal(joinedOpen.html.includes("ab"), false);
    const mark = new File(["{\\rtf1 a\\zwj b}"], "zwj.rtf");
    const markOpen = await importDocument(mark);
    assert.equal(markOpen.html.includes("a\u200db"), true);
    assert.equal(markOpen.html.includes("ab"), false);
    const ru = new File(["{\\rtf1\\ansi\\ansicpg1251 \\'c0}"], "ru.rtf");
    const ruOpen = await importDocument(ru);
    assert.equal(ruOpen.html.includes("\u0410"), true);
    assert.equal(ruOpen.html.includes("\u00c0"), false);
    const pl = new File(["{\\rtf1\\ansi\\ansicpg1250 \\'a5}"], "pl.rtf");
    const plOpen = await importDocument(pl);
    assert.equal(plOpen.html.includes("\u0104"), true);
    assert.equal(plOpen.html.includes("\u00a5"), false);
    const notedRtf = new File(["{\\rtf1 See{\\footnote The note.} this\\chftn next}"], "fn.rtf");
    const notedRtfOpen = await importDocument(notedRtf);
    assert.equal(notedRtfOpen.html.includes("SeeThe"), false);
    assert.equal(notedRtfOpen.html.includes("thisnext"), false);
    assert.match(notedRtfOpen.html, /See The note\./);
    assert.match(notedRtfOpen.html, /this next/);
    const comment = new File(["{\\rtf1 hello{\\annotation a note}there}"], "ann.rtf");
    const commentOpen = await importDocument(comment);
    assert.equal(commentOpen.html.includes("helloa"), false);
    assert.match(commentOpen.html, /hello a note/);
    const side = new File(["{\\rtf1{\\headerl \\pard Left header\\par}{\\footerf \\pard First foot\\par}Body text}"], "side.rtf");
    const sideOpen = await importDocument(side);
    assert.equal(sideOpen.html.includes("Left header"), false);
    assert.equal(sideOpen.html.includes("First foot"), false);
    assert.match(sideOpen.html, /Body text/);
    const plainHeader = new File(["{\\rtf1{\\header \\pard Secret\\par}Body}"], "head.rtf");
    const plainHeaderOpen = await importDocument(plainHeader);
    assert.equal(plainHeaderOpen.html.includes("Secret"), false);
    assert.match(plainHeaderOpen.html, /Body/);
    const commented = `<w:document><w:p><w:r><w:t>hello</w:t></w:r><w:r><w:commentReference w:id="1"/></w:r><w:r><w:t>world</w:t></w:r></w:p><w:p><w:r><w:t>see</w:t></w:r><w:r><w:annotationRef></w:annotationRef></w:r><w:r><w:t>note</w:t></w:r></w:p><w:p><w:r><w:t>Page</w:t></w:r><w:r><w:pgNum/></w:r><w:r><w:t>of</w:t></w:r></w:p><w:p><w:r><w:t>on</w:t></w:r><w:r><w:dayLong/></w:r><w:r><w:t>we</w:t></w:r></w:p></w:document>`;
    const commentedOpen = await importDocument(new File([await (await zipStore([{ name: "word/document.xml", data: new TextEncoder().encode(commented) }])).arrayBuffer()], "mark2.docx"));
    assert.equal(commentedOpen.html.includes("helloworld"), false);
    assert.equal(commentedOpen.html.includes("seenote"), false);
    assert.equal(commentedOpen.html.includes("Pageof"), false);
    assert.equal(commentedOpen.html.includes("onwe"), false);
    assert.match(commentedOpen.html, /hello world/);
    assert.match(commentedOpen.html, /see note/);
    assert.match(commentedOpen.html, /Page of/);
    assert.match(commentedOpen.html, /on we/);
    assert.equal(commentedOpen.html.includes("October"), false);
    const refOnly = `<w:document><w:p><w:r><w:t>hello</w:t></w:r><w:r><w:footnoteRef/></w:r><w:r><w:t>world</w:t></w:r></w:p><w:p><w:r><w:t>see</w:t></w:r><w:r><w:endnoteRef></w:endnoteRef></w:r><w:r><w:t>note</w:t></w:r></w:p></w:document>`;
    const refOpen = await importDocument(new File([await (await zipStore([{ name: "word/document.xml", data: new TextEncoder().encode(refOnly) }])).arrayBuffer()], "ref.docx"));
    assert.equal(refOpen.html.includes("helloworld"), false);
    assert.equal(refOpen.html.includes("seenote"), false);
    assert.match(refOpen.html, /hello world/);
    assert.match(refOpen.html, /see note/);
    const ruby = `<w:document><w:p><w:r><w:ruby><w:rt><w:r><w:t>tou</w:t></w:r></w:rt><w:rubyBase><w:r><w:t>東</w:t></w:r></w:rubyBase></w:ruby></w:r></w:p></w:document>`;
    const rubyOpen = await importDocument(new File([await (await zipStore([{ name: "word/document.xml", data: new TextEncoder().encode(ruby) }])).arrayBuffer()], "ruby.docx"));
    assert.equal(rubyOpen.html.includes("東"), true);
    assert.equal(rubyOpen.html.includes("tou"), false);
    const zw = new File(["{\\rtf1 a\\zwbo b\\zwnbo c}"], "zw.rtf");
    const zwOpen = await importDocument(zw);
    assert.equal(zwOpen.html.includes("a\u200bb\u2060c"), true);
    assert.equal(zwOpen.html.includes("abc"), false);
    const gap = new File(["{\\rtf1 on\\chdate we\\chpgn go\\chftnsep next}"], "gap.rtf");
    const gapOpen = await importDocument(gap);
    assert.equal(gapOpen.html.includes("onwe"), false);
    assert.equal(gapOpen.html.includes("wego"), false);
    assert.equal(gapOpen.html.includes("gonext"), false);
    assert.match(gapOpen.html, /on we go/);
    assert.match(gapOpen.html, /go next/);
    assert.equal(/\d{4}/.test(gapOpen.html), false);
    const shape = new File(["{\\rtf1{\\shp{\\sp{\\sn shapeType}{\\sv 1}}{\\shptxt Hello shape}}Body}"], "shp.rtf");
    const shapeOpen = await importDocument(shape);
    assert.equal(shapeOpen.html.includes("shapeType"), false);
    assert.match(shapeOpen.html, /Hello shape/);
    assert.match(shapeOpen.html, /Body/);
    const inst = new File(["{\\rtf1 before{\\shp{\\*\\shpinst{\\shptxt Hello shape}}{\\shprslt Hello shape}}after}"], "inst.rtf");
    const instOpen = await importDocument(inst);
    assert.equal((instOpen.html.match(/Hello shape/g) || []).length, 1);
    assert.equal(instOpen.html.includes("beforeHello"), false);
    assert.equal(instOpen.html.includes("shapeafter"), false);
    assert.match(instOpen.html, /before Hello shape after/);
    const onlyInst = new File(["{\\rtf1{\\shp{\\*\\shpinst{\\shptxt Only inst}}}Body}"], "only-inst.rtf");
    const onlyInstOpen = await importDocument(onlyInst);
    assert.match(onlyInstOpen.html, /Only inst/);
    assert.match(onlyInstOpen.html, /Body/);
    assert.equal(onlyInstOpen.html.includes("instBody"), false);
    const onlyResult = new File(["{\\rtf1{\\shp{\\shprslt Only result}}Body}"], "only-result.rtf");
    const onlyResultOpen = await importDocument(onlyResult);
    assert.match(onlyResultOpen.html, /Only result/);
    assert.equal(onlyResultOpen.html.includes("resultBody"), false);
    const reset = new File(["{\\rtf1 hello\\pard world}"], "pard.rtf");
    const resetOpen = await importDocument(reset);
    assert.equal(resetOpen.html.includes("<br>"), false);
    assert.match(resetOpen.html, /helloworld/);
    const wordish = new File(["{\\rtf1\\ansi\\pard\\plain hello world\\par\\pard\\plain second line\\par}"], "wordish.rtf");
    const wordishOpen = await importDocument(wordish);
    assert.match(wordishOpen.html, /<p>hello world<\/p>/);
    assert.match(wordishOpen.html, /<p>second line<\/p>/);
    const bookmark = new File(["{\\rtf1 hello{\\*\\bkmkstart mark} world}"], "bkmk.rtf");
    const bookmarkOpen = await importDocument(bookmark);
    assert.equal(bookmarkOpen.html.includes("mark"), false);
    assert.match(bookmarkOpen.html, /hello world/);
    const toc = new File(["{\\rtf1{\\tc Hidden toc words}Body}"], "toc.rtf");
    const tocOpen = await importDocument(toc);
    assert.equal(tocOpen.html.includes("Hidden"), false);
    assert.match(tocOpen.html, /Body/);
    const indexed = new File(["{\\rtf1 word{\\xe Index entry} next}"], "xe.rtf");
    const indexedOpen = await importDocument(indexed);
    assert.equal(indexedOpen.html.includes("Index"), false);
    assert.match(indexedOpen.html, /word next/);
    const drawn = `<w:document><w:p><w:r><w:t>hello</w:t></w:r><w:r><w:drawing/></w:r><w:r><w:t>world</w:t></w:r></w:p><w:p><w:r><w:t>see</w:t></w:r><w:r><w:object/></w:r><w:r><w:t>this</w:t></w:r></w:p><w:p><w:r><w:t>and</w:t></w:r><w:r><w:pict></w:pict></w:r><w:r><w:t>that</w:t></w:r></w:p></w:document>`;
    const drawnOpen = await importDocument(new File([await (await zipStore([{ name: "word/document.xml", data: new TextEncoder().encode(drawn) }])).arrayBuffer()], "draw.docx"));
    assert.equal(drawnOpen.html.includes("helloworld"), false);
    assert.equal(drawnOpen.html.includes("seethis"), false);
    assert.equal(drawnOpen.html.includes("andthat"), false);
    assert.match(drawnOpen.html, /hello world/);
    assert.match(drawnOpen.html, /see this/);
    assert.match(drawnOpen.html, /and that/);
    const emptyDrawing = `<w:document><w:p><w:r><mc:AlternateContent><mc:Choice><w:drawing/></mc:Choice><mc:Fallback><w:t>Only</w:t></mc:Fallback></mc:AlternateContent></w:r><w:r><w:t>After</w:t></w:r></w:p></w:document>`;
    const emptyDrawingOpen = await importDocument(new File([await (await zipStore([{ name: "word/document.xml", data: new TextEncoder().encode(emptyDrawing) }])).arrayBuffer()], "empty-draw.docx"));
    assert.match(emptyDrawingOpen.html, /Only/);
    assert.match(emptyDrawingOpen.html, /After/);
    const placeholder = new File(["{\\rtf1 hello\\objattph world}"], "obj.rtf");
    const placeholderOpen = await importDocument(placeholder);
    assert.equal(placeholderOpen.html.includes("helloworld"), false);
    assert.match(placeholderOpen.html, /hello world/);
    const embedded = `<w:document><w:p><w:r><w:t>hello</w:t></w:r><w:r><w:contentPart r:id="rId8"/></w:r><w:r><w:t>world</w:t></w:r></w:p></w:document>`;
    const embeddedOpen = await importDocument(new File([await (await zipStore([{ name: "word/document.xml", data: new TextEncoder().encode(embedded) }])).arrayBuffer()], "part.docx"));
    assert.equal(embeddedOpen.html.includes("helloworld"), false);
    assert.match(embeddedOpen.html, /hello world/);
    const field = `<w:document><w:p><w:r><w:t>hello</w:t></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText>PAGE</w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r><w:r><w:t>world</w:t></w:r></w:p></w:document>`;
    const fieldOpen = await importDocument(new File([await (await zipStore([{ name: "word/document.xml", data: new TextEncoder().encode(field) }])).arrayBuffer()], "field.docx"));
    assert.equal(fieldOpen.html.includes("helloworld"), false);
    assert.equal(fieldOpen.html.includes("PAGE"), false);
    assert.match(fieldOpen.html, /hello\s+world/);
    const bareField = new File(["{\\rtf1 hello{\\field{\\*\\fldinst PAGE}}world}"], "bare-field.rtf");
    const bareFieldOpen = await importDocument(bareField);
    assert.equal(bareFieldOpen.html.includes("helloworld"), false);
    assert.equal(bareFieldOpen.html.includes("PAGE"), false);
    assert.match(bareFieldOpen.html, /hello\s+world/);
    const fieldResult = new File(["{\\rtf1 hello{\\field{\\*\\fldinst PAGE}{\\fldrslt 12}}world}"], "field-result.rtf");
    const fieldResultOpen = await importDocument(fieldResult);
    assert.match(fieldResultOpen.html, /12/);
    assert.equal(fieldResultOpen.html.includes("PAGE"), false);
    assert.equal(fieldResultOpen.html.includes("helloworld"), false);
    const simple = `<w:document><w:p><w:r><w:t>hello</w:t></w:r><w:fldSimple w:instr=" PAGE "><w:r><w:t>4</w:t></w:r></w:fldSimple><w:r><w:t>world</w:t></w:r></w:p></w:document>`;
    const simpleOpen = await importDocument(new File([await (await zipStore([{ name: "word/document.xml", data: new TextEncoder().encode(simple) }])).arrayBuffer()], "simple.docx"));
    assert.equal(simpleOpen.html.includes("PAGE"), false);
    assert.equal(simpleOpen.html.includes("helloworld"), false);
    assert.equal(simpleOpen.html.includes("hello4"), false);
    assert.match(simpleOpen.html, /4/);
    assert.match(simpleOpen.html, /hello/);
    assert.match(simpleOpen.html, /world/);
    const objectGroup = new File(["{\\rtf1 hello{\\object\\objattph}world}"], "obj-group.rtf");
    const objectOpen = await importDocument(objectGroup);
    assert.equal(objectOpen.html.includes("helloworld"), false);
    assert.match(objectOpen.html, /hello world/);
    const pictGroup = new File(["{\\rtf1 hello{\\pict\\bin0 }world}"], "pict-group.rtf");
    const pictOpen = await importDocument(pictGroup);
    assert.equal(pictOpen.html.includes("helloworld"), false);
    assert.match(pictOpen.html, /hello world/);
    const ja = new File(["{\\rtf1\\ansi\\ansicpg932 \\'82\\'a0}"], "ja.rtf");
    const jaOpen = await importDocument(ja);
    assert.equal(jaOpen.html.includes("\u3042"), true);
    assert.equal(jaOpen.html.includes("\u0082"), false);
    const zh = new File(["{\\rtf1\\ansi\\ansicpg936 \\'b0\\'a1}"], "zh.rtf");
    const zhOpen = await importDocument(zh);
    assert.equal(zhOpen.html.includes("\u554a"), true);
    const ko = new File(["{\\rtf1\\ansi\\ansicpg949 \\'b0\\'a1}"], "ko.rtf");
    const koOpen = await importDocument(ko);
    assert.equal(koOpen.html.includes("\uac00"), true);
    const tw = new File(["{\\rtf1\\ansi\\ansicpg950 \\'a4\\'40}"], "tw.rtf");
    const twOpen = await importDocument(tw);
    assert.equal(twOpen.html.includes("\u4e00"), true);
    const mac = new File(["{\\rtf1\\mac \\'a0}"], "mac.rtf");
    const macOpen = await importDocument(mac);
    assert.equal(macOpen.html.includes("\u2020"), true);
    assert.equal(macOpen.html.includes("\u00a0"), false);
    const dos = new File(["{\\rtf1\\pc \\'80}"], "dos.rtf");
    const dosOpen = await importDocument(dos);
    assert.equal(dosOpen.html.includes("\u0080"), true);
    assert.equal(dosOpen.html.includes("\u00c7"), false);
    const jaFont = new File(["{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0\\fnil\\fcharset128 MS Gothic;}}\\f0\\'82\\'a0}"], "ja-font.rtf");
    const jaFontOpen = await importDocument(jaFont);
    assert.equal(jaFontOpen.html.includes("\u3042"), true);
    assert.equal(jaFontOpen.html.includes("\u0082"), false);
    const ruFont = new File(["{\\rtf1\\ansi\\ansicpg1252{\\fonttbl{\\f0\\fcharset204 Times;}}\\f0\\'c0}"], "ru-font.rtf");
    const ruFontOpen = await importDocument(ruFont);
    assert.equal(ruFontOpen.html.includes("\u0410"), true);
    assert.equal(ruFontOpen.html.includes("\u00c0"), false);
    const back = new File(["{\\rtf1\\ansi\\ansicpg1252{\\fonttbl{\\f0\\fcharset128 G;\\f1\\fcharset0 T;}}\\f0\\'82\\'a0 \\f1 caf\\'e9}"], "back.rtf");
    const backOpen = await importDocument(back);
    assert.equal(backOpen.html.includes("\u3042"), true);
    assert.equal(backOpen.html.includes("caf\u00e9"), true);
    const still = new File(["{\\rtf1\\ansi\\ansicpg1252 it\\'92s}"], "still.rtf");
    const stillOpen = await importDocument(still);
    assert.match(stillOpen.html, /it\u2019s/);
  });
});

describe("pdf", () => {
  it("asks Times-Roman for WinAnsi", async () => {
    const previous = globalThis.DOMParser;
    globalThis.DOMParser = class {
      parseFromString() {
        const root = {
          childNodes: [] as unknown[],
          querySelectorAll() {
            return [];
          },
        };
        return { getElementById: () => root, body: root };
      }
    } as unknown as typeof DOMParser;
    try {
      const bytes = await buildPdf("Hello", "<p>Hi</p>");
      const text = Buffer.from(bytes).toString("latin1");
      assert.match(text, /\/BaseFont \/Times-Roman/);
      assert.match(text, /\/Encoding \/WinAnsiEncoding/);
    } finally {
      if (previous) globalThis.DOMParser = previous;
      else delete (globalThis as { DOMParser?: unknown }).DOMParser;
    }
  });
});

describe("page styles", () => {
  it("drops a cover style and leaves colour, a relative offset, and add-on css", () => {
    const cleaned = sanitizeInlineStyle("position:fixed;inset:0;width:100vh;color:#112233;position:relative;left:4px;filter:grayscale(1)");
    assert.equal(/fixed/i.test(cleaned), false);
    assert.equal(/vh/i.test(cleaned), false);
    assert.match(cleaned, /#112233/);
    assert.match(cleaned, /relative/);
    assert.match(cleaned, /left:4px/);
    assert.match(cleaned, /grayscale/);
    const bare = sanitizeInlineStyle("position:absolute !important;top:0");
    assert.equal(/absolute/i.test(bare), false);
    assert.equal(/fixed/i.test(sanitizeInlineStyle("position:/**/fixed;top:0")), false);
    assert.equal(/fixed/i.test(sanitizeInlineStyle("position:\\66 ixed;top:0")), false);
    assert.equal(/vw/i.test(sanitizeInlineStyle("width:100\\76 w")), false);
    assert.equal(/fixed|absolute|sticky/i.test(sanitizeInlineStyle("position:var(--q,fixed);inset:0")), false);
    assert.equal(/sticky/i.test(sanitizeInlineStyle("position:-webkit-sticky;top:0")), false);
    assert.equal(/fixed/i.test(sanitizeInlineStyle("color:\\d800;position:\\d800 fixed")), false);
    assert.match(sanitizeInlineStyle("position:relative;left:4px;color:#112233"), /relative/);
    assert.equal(sanitizeEditStyle("filter:\\75 rl(https://evil.test);transform:rotate(90deg)"), "transform:rotate(90deg)");
    assert.match(sanitizeEditStyle("filter:grayscale(1);transform:rotate(90deg) scale(-1, 1)"), /grayscale/);
    assert.match(sanitizePluginCss(".desk{position:fixed;top:0}"), /fixed/);
    assert.equal(/evil\.test/i.test(sanitizePluginCss(".a{background:u\\72 l(https://evil.test/a.png)}")), false);
    assert.equal(/@import|evil\.test/i.test(sanitizePluginCss("@\\69 mport 'https://evil.test/a.css';")), false);
    assert.match(sanitizePluginCss(".a{background:url(data:image/png;base64,aaaa)}"), /data:image\/png/);
    assert.equal(/evil\.test/i.test(sanitizePluginCss(".a{background:u/**/rl(https://evil.test/a.png)}")), false);
    assert.equal(/evil\.test/i.test(sanitizePluginCss(".a{background:url/**/(https://evil.test/a.png)}")), false);
    assert.equal(/@import|evil\.test/i.test(sanitizePluginCss("@im/**/port 'https://evil.test/a.css';")), false);
    assert.equal(/evil\.test/i.test(sanitizePluginCss(".a{background:image-set('https://evil.test/a.png' 1x)}")), false);
    assert.equal(/evil\.test/i.test(sanitizeInlineStyle("background:image-set('https://evil.test/a.png' 1x);color:red")), false);
    assert.match(sanitizeInlineStyle("background:image-set('https://evil.test/a.png' 1x);color:red"), /red/);
    assert.match(sanitizePluginCss(".a{background:image-set('data:image/png;base64,aaaa' 1x)}"), /data:image\/png/);
    assert.match(sanitizePluginCss('.a{content:"/* stay */"}'), /stay/);
    assert.equal(/evil\.test/i.test(sanitizePluginCss(".a{background:src('https://evil.test/a.png')}")), false);
    assert.equal(/evil\.test/i.test(sanitizePluginCss(".a{background:image-set(src('https://evil.test/a.png') 1x)}")), false);
    assert.equal(/evil\.test/i.test(sanitizePluginCss(".a{background:s/**/rc('https://evil.test/a.png')}")), false);
    assert.equal(/evil\.test/i.test(sanitizeInlineStyle("background:src('https://evil.test/a.png');color:red")), false);
    assert.match(sanitizeInlineStyle("background:src('https://evil.test/a.png');color:red"), /red/);
    assert.equal(/evil\.test/i.test(sanitizePluginCss(".a{background:image(https://evil.test/a.png)}")), false);
    assert.match(sanitizePluginCss(".a{background:src('data:image/png;base64,aaaa')}"), /data:image\/png/);
    assert.match(sanitizePluginCss(".a{background:url(data:image/png;base64,abc//def+g==)}"), /abc\/\/def/);
    assert.equal(/evil\.test/i.test(sanitizePluginCss('.a{background:image-set("data:image/png;base64,aaaa" 1x, https://evil.test/a.png 2x)}')), false);
    assert.equal(/evil\.test/i.test(sanitizePluginCss(".a{background:src('data:image/png;base64,aaaa' https://evil.test/a.png)}")), false);
    assert.equal(/evil\.test/i.test(sanitizePluginCss('.a{background:url("data:image/png;base64,aaaa" https://evil.test/a.png)}')), false);
    assert.match(sanitizeInlineStyle('background:image-set("data:image/png;base64,aaaa" 1x);color:#112233'), /data:image\/png;base64,aaaa/);
    assert.equal(/evil\.test/i.test(sanitizeInlineStyle('background:image-set("data:image/png;base64,aaaa" 1x, https://evil.test/a.png 2x);color:#112233')), false);
    assert.match(sanitizeInlineStyle('background:image-set("data:image/png;base64,aaaa" 1x, https://evil.test/a.png 2x);color:#112233'), /#112233/);
    assert.equal(/evil\.test/i.test(sanitizePluginCss('.a{background:image-set("https://evil.test/a.png" type("image/png"))}')), false);
    assert.equal(/evil\.test/i.test(sanitizePluginCss('.a{background:image(linear-gradient(white,black),"https://evil.test/a.png")}')), false);
    assert.equal(/evil\.test/i.test(sanitizeInlineStyle('background:image-set(linear-gradient(white,black),"https://evil.test/a.png");color:#112233')), false);
    assert.match(sanitizeInlineStyle('background:image-set(linear-gradient(white,black),"https://evil.test/a.png");color:#112233'), /#112233/);
    assert.match(sanitizePluginCss('.a{background:image-set("data:image/png;base64,aaaa" type("image/png"))}'), /data:image\/png/);
    assert.match(sanitizePluginCss(".a{background:image-set(linear-gradient(white,black) 1x)}"), /linear-gradient/);
    const smuggled = sanitizePluginCss('.a{--u:"https://evil.test/a.png";background:image-set(var(--u) 1x)}');
    assert.equal(/image-set\s*\(/i.test(smuggled), false);
    assert.match(smuggled, /none/);
    assert.equal(sanitizeEditStyle("filter:src('https://evil.test/a.png');transform:rotate(90deg)"), "transform:rotate(90deg)");
    const splitUrl = "u\\\nrl(https://evil.test/a.png)";
    assert.equal(/evil\.test/i.test(sanitizePluginCss(`.a{background:${splitUrl}}`)), false);
    assert.equal(/evil\.test/i.test(sanitizePluginCss("@im\\\nport 'https://evil.test/a.css';")), false);
    assert.equal(/display\s*:\s*none/i.test(sanitizePluginCss("h\\\ntml{display:none}")), false);
    assert.equal(/expression/i.test(sanitizePluginCss("expr\\\nession(alert(1))")), false);
    assert.equal(/evil\.test/i.test(sanitizeInlineStyle(`background:${splitUrl};color:#112233`)), false);
    assert.match(sanitizeInlineStyle(`background:${splitUrl};color:#112233`), /#112233/);
    assert.equal(sanitizeEditStyle(`filter:${splitUrl};transform:rotate(90deg)`), "transform:rotate(90deg)");
    assert.equal(/evil\.test/i.test(sanitizePluginCss(".a{background:u\\\r\nrl(https://evil.test/a.png)}")), false);
    assert.match(sanitizePluginCss(".a{background:url(data:image/png;base64,aaaa)}"), /data:image\/png/);
    assert.match(sanitizePluginCss(".desk{position:fixed;top:0}"), /fixed/);
    const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
    assert.match(css, /html\[data-device="phone"\] \.page-frame,\s*html\[data-device="phone"\] \.page-frame\.is-bare\s*\{[^}]*grid-template-rows:\s*var\(--page-h/);
    assert.match(css, /html\[data-device="phone"\] \.page-frame \.ruler[\s\S]*?display:\s*none/);
    const dynamic = sanitizeInlineStyle("width:100dvh;height:100svh;min-height:100lvh;max-width:100dvw;color:#112233");
    assert.equal(/dvh|svh|lvh|dvw/i.test(dynamic), false);
    assert.match(dynamic, /#112233/);
    assert.match(sanitizeInlineStyle("position:relative;left:4px"), /relative/);
    assert.equal(/evil\.test/i.test(sanitizePluginCss(".a{background:-webkit-cross-fade(https://evil.test/a.png, white, 50%)}")), false);
    assert.equal(/evil\.test/i.test(sanitizeInlineStyle("background:cross-fade(https://evil.test/a.png, white);color:#112233")), false);
    assert.match(sanitizeInlineStyle("background:cross-fade(https://evil.test/a.png, white);color:#112233"), /#112233/);
    assert.match(sanitizePluginCss(".a{background:cross-fade(white, black)}"), /white/);
    assert.equal(/attr\(\s*title\s+url/i.test(sanitizeInlineStyle("background:attr(title url);color:#112233")), false);
    assert.match(sanitizeInlineStyle("background:attr(title url);color:#112233"), /#112233/);
    assert.equal(/attr\(\s*title\s+url/i.test(sanitizePluginCss("h1{background-image:attr(title url);color:red}")), false);
    assert.match(sanitizePluginCss("h1{background-image:attr(title url);color:red}"), /red/);
    assert.match(sanitizePluginCss("h1:before{content:attr(data-note)}"), /attr\(data-note\)/);
    assert.match(sanitizePluginCss("h1:before{content:attr(url)}"), /attr\(url\)/);
    assert.equal(/attr\s*\(/i.test(sanitizeInlineStyle("background:image(attr(title));color:#112233")), false);
    assert.match(sanitizeInlineStyle("background:image(attr(title));color:#112233"), /#112233/);
    assert.equal(/attr\s*\(/i.test(sanitizePluginCss(".a{background:cross-fade(attr(title), white)}")), false);
    assert.match(sanitizePluginCss(".a{background:cross-fade(white, black)}"), /white/);
    assert.equal(/attr\(\s*title\s+url/i.test(sanitizeInlineStyle("background:attr(title \\75 rl);color:#112233")), false);
    assert.match(sanitizeInlineStyle("background:attr(title \\75 rl);color:#112233"), /#112233/);
    assert.equal(sanitizeEditStyle("filter:grayscale(1);background:attr(title url)"), "filter:grayscale(1)");
    assert.match(sanitizePluginCss(".desk{position:fixed;top:0}"), /fixed/);
    assert.match(sanitizeInlineStyle("content:attr(data-note);color:#112233"), /attr\(data-note\)/);
    assert.match(sanitizePluginCss('h1{content:"attr(title url)"}'), /attr\(title url\)/);
    assert.match(sanitizeInlineStyle("background:attr(url);color:#112233"), /attr\(url\)/);
    const cq = sanitizeInlineStyle("width:100cqw;height:100cqh;min-height:100cqi;max-width:100cqb;min-width:10cqmin;max-height:10cqmax;color:#112233");
    assert.equal(/cq(?:w|h|i|b|min|max)/i.test(cq), false);
    assert.match(cq, /#112233/);
    assert.equal(/cqh/i.test(sanitizeInlineStyle("height:100\\63 qh;color:#112233")), false);
    assert.match(sanitizePluginCss(".desk{width:100cqh;position:fixed}"), /100cqh/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("html{display:var(--q,none)}")), false);
    assert.equal(/pointer-events\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("body{pointer-events:var(--q,none)}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("*{display:none}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("@media all{*{display:none}}")), false);
    assert.equal(/visibility\s*:\s*hidden/i.test(sanitizePluginCss("html{visibility:hidden}")), false);
    assert.equal(/content-visibility\s*:\s*hidden/i.test(sanitizePluginCss(":root{content-visibility:hidden}")), false);
    assert.equal(/opacity\s*:\s*0(?![0-9.])/.test(sanitizePluginCss("html{opacity:0}")), false);
    assert.match(sanitizePluginCss("html{opacity:0.5;color:#112233}"), /0\.5/);
    assert.match(sanitizePluginCss(".note{display:none;color:red}"), /display:\s*none/);
    assert.equal(/evil\.test|display\s*:\s*none/i.test(sanitizePluginCss("html{display:image(https://evil.test/a.png)}")), false);
    assert.equal(/display\s*:\s*none/i.test(sanitizePluginCss("html{display:attr(title url)}")), false);
    assert.match(sanitizePluginCss("html{color:#112233}"), /#112233/);
    assert.match(sanitizePluginCss("h1:before{content:attr(data-note)}"), /attr\(data-note\)/);
    assert.equal(/opacity\s*:\s*\.0/.test(sanitizePluginCss("html{opacity:.0;color:#112233}")), false);
    assert.equal(/opacity\s*:\s*0\./.test(sanitizePluginCss("html{opacity:0.;color:#112233}")), false);
    assert.equal(/opacity\s*:\s*00/.test(sanitizePluginCss("html{opacity:00;color:#112233}")), false);
    assert.equal(/opacity\s*:\s*\+0/.test(sanitizePluginCss("html{opacity:+0;color:#112233}")), false);
    assert.equal(/opacity\s*:\s*var\(--o,\s*0\)/.test(sanitizePluginCss("html{opacity:var(--o, 0);color:#112233}")), false);
    assert.match(sanitizePluginCss("html{opacity:.0;color:#112233}"), /#112233/);
    assert.match(sanitizePluginCss("html{opacity:0.5;color:#112233}"), /0\.5/);
    assert.match(sanitizePluginCss(":root{--o:0.5}html{opacity:var(--o)}"), /var\(--o\)/);
    assert.equal(/opacity\s*:\s*var\(--o\)/.test(sanitizePluginCss(":root{--o:0}html{opacity:var(--o);color:#112233}")), false);
    assert.match(sanitizePluginCss(":root{--o:0}html{opacity:var(--o);color:#112233}"), /#112233/);
    assert.equal(/display\s*:\s*var\(--d\)/.test(sanitizePluginCss(":root{--d:none}html{display:var(--d);color:#112233}")), false);
    assert.match(sanitizePluginCss("html{display:var(--d, block);color:#112233}"), /display:\s*var\(--d,\s*block\)/);
    assert.equal(/visibility\s*:\s*collapse/.test(sanitizePluginCss("html{visibility:collapse;color:#112233}")), false);
    assert.equal(/opacity\s*\(\s*0/.test(sanitizePluginCss("html{filter:opacity(0);color:#112233}")), false);
    assert.match(sanitizePluginCss("html{filter:opacity(0);color:#112233}"), /#112233/);
    assert.match(sanitizePluginCss("html{filter:grayscale(1)}"), /grayscale/);
    assert.match(sanitizePluginCss("html{filter:opacity(0.5)}"), /opacity\(0\.5\)/);
    assert.match(sanitizePluginCss("html{transform:rotate(2deg)}"), /rotate\(2deg\)/);
    assert.equal(/scale\s*\(\s*0/.test(sanitizePluginCss("html{transform:scale(0);color:#112233}")), false);
    assert.match(sanitizePluginCss("html{transform:scale(0);color:#112233}"), /#112233/);
    assert.equal(/display\s*:\s*none/.test(sanitizePluginCss(":is(*){display:none;color:red}")), false);
    assert.match(sanitizePluginCss(":is(*){display:none;color:red}"), /red/);
    assert.equal(/opacity\s*:\s*0(?![0-9.])/.test(sanitizePluginCss(":where(*){opacity:0;color:red}")), false);
    assert.match(sanitizePluginCss(":where(*){opacity:0.5;color:red}"), /0\.5/);
    assert.match(sanitizePluginCss(":is(.note){display:none;color:red}"), /display:\s*none/);
    assert.equal(/type\(\s*<url/.test(sanitizePluginCss("h1{background:attr(title type(<url>));color:red}")), false);
    assert.match(sanitizePluginCss("h1{background:attr(title type(<url>));color:red}"), /red/);
    assert.equal(/type\(\s*<image/.test(sanitizePluginCss(".a{background:attr(title type(<image>))}")), false);
    assert.match(sanitizePluginCss("h1:before{content:attr(data-note type(<string>))}"), /attr\(data-note type\(<string>\)\)/);
    assert.match(sanitizePluginCss('h1{content:"attr(title type(<url>))"}'), /type\(<url>\)/);
    assert.match(sanitizeInlineStyle("background:attr(title type(<url>));color:#112233"), /#112233/);
    assert.equal(/type\(\s*<url/.test(sanitizeInlineStyle("background:attr(title type(<url>));color:#112233")), false);
    assert.match(sanitizePluginCss(".desk{position:fixed;top:0}"), /fixed/);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:calc(0);color:#112233}")), false);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:calc(0%);color:#112233}")), false);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:calc(0 * 1);color:#112233}")), false);
    assert.match(sanitizePluginCss("html{opacity:calc(0);color:#112233}"), /#112233/);
    assert.match(sanitizePluginCss("html{opacity:calc(0.5)}"), /calc\(0\.5\)/);
    assert.equal(/opacity\s*:\s*var\(\s*--o\s*\)/i.test(sanitizePluginCss("html{--o:calc(0);opacity:var(--o)}")), false);
    assert.equal(/zoom/i.test(sanitizePluginCss("html{zoom:0;color:#112233}")), false);
    assert.match(sanitizePluginCss("html{zoom:0;color:#112233}"), /#112233/);
    assert.match(sanitizePluginCss("html{zoom:1.1}"), /zoom:\s*1\.1/);
    assert.equal(/scale\(\s*calc\(\s*0\s*\)/i.test(sanitizePluginCss("html{transform:scale(calc(0))}")), false);
    assert.match(sanitizePluginCss("html{transform:rotate(2deg)}"), /rotate\(2deg\)/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("* *{display:none}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("*+*{display:none}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("*>*{display:none}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("*~*{display:none}")), false);
    assert.match(sanitizePluginCss("* .note{display:none}"), /display:\s*none/);
    assert.match(sanitizePluginCss(".note{display:none}"), /display:\s*none/);
    const sci = sanitizeInlineStyle("width:1e2vw;height:.5e2dvh;min-width:+100vh;max-width:1e2cqw;width:1e2px;color:#112233");
    assert.equal(/vw|vh|dvh|cqw/i.test(sci), false);
    assert.match(sci, /1e2px/);
    assert.match(sci, /#112233/);
    assert.match(sanitizeInlineStyle("position:relative;left:4px"), /relative/);
    assert.match(sanitizePluginCss(".desk{width:1e2vw;position:fixed}"), /1e2vw/);
    assert.match(sanitizePluginCss(".desk{width:1e2vw;position:fixed}"), /fixed/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss(":nth-child(n){display:none;color:red}")), false);
    assert.match(sanitizePluginCss(":nth-child(n){display:none;color:red}"), /red/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss(":nth-of-type(n){display:none}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss(":nth-last-child(n){display:none}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss(":not(:not(*)){display:none;color:red}")), false);
    assert.match(sanitizePluginCss(":not(:not(*)){display:none;color:red}"), /red/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("*, .note{display:none;color:red}")), false);
    assert.match(sanitizePluginCss(".note{display:none}"), /display:\s*none/);
    assert.match(sanitizePluginCss("* .note{display:none}"), /display:\s*none/);
    assert.equal(/opacity\s*:\s*min\(\s*0/i.test(sanitizePluginCss("html{opacity:min(0, 1);color:#112233}")), false);
    assert.match(sanitizePluginCss("html{opacity:min(0, 1);color:#112233}"), /#112233/);
    assert.match(sanitizePluginCss("html{opacity:min(0.5, 1)}"), /min\(0\.5,\s*1\)/);
    assert.equal(/opacity\s*:\s*max\(\s*0/i.test(sanitizePluginCss("html{opacity:max(0, 0)}")), false);
    assert.equal(/opacity\s*:\s*clamp/i.test(sanitizePluginCss("html{opacity:clamp(0, 0, 1);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:clamp(0, 0.4, 1)}"), /clamp/);
    assert.equal(/opacity\s*:\s*abs/i.test(sanitizePluginCss("html{opacity:abs(0)}")), false);
    assert.equal(/opacity\s*:\s*calc\(\s*0px/i.test(sanitizePluginCss("html{opacity:calc(0px / 1px);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:calc(0px / 1px);color:red}"), /red/);
    assert.match(sanitizePluginCss("html{opacity:calc(1px / 2px)}"), /calc\(1px \/ 2px\)/);
    assert.equal(/matrix\(\s*0/i.test(sanitizePluginCss("html{transform:matrix(0, 0, 0, 0, 0, 0);color:red}")), false);
    assert.match(sanitizePluginCss("html{transform:matrix(0, 0, 0, 0, 0, 0);color:red}"), /red/);
    assert.match(sanitizePluginCss("html{transform:matrix(1, 0, 0, 1, 10px, 0)}"), /matrix/);
    assert.match(sanitizePluginCss("html{transform:rotate(2deg)}"), /rotate\(2deg\)/);
    assert.equal(/rotateY/i.test(sanitizePluginCss("html{transform:rotateY(90deg);color:red}")), false);
    assert.match(sanitizePluginCss("html{transform:rotateY(90deg);color:red}"), /red/);
    assert.equal(/brightness\(\s*0/i.test(sanitizePluginCss("html{filter:brightness(0);color:red}")), false);
    assert.match(sanitizePluginCss("html{filter:brightness(0);color:red}"), /red/);
    assert.match(sanitizePluginCss("html{filter:grayscale(1)}"), /grayscale/);
    assert.match(sanitizePluginCss("html{filter:brightness(1)}"), /brightness\(1\)/);
    assert.equal(/animation/i.test(sanitizePluginCss("@keyframes q{to{opacity:0}}html{animation:q 0s forwards;color:red}")), false);
    assert.match(sanitizePluginCss("@keyframes q{to{opacity:0}}html{animation:q 0s forwards;color:red}"), /red/);
    assert.match(sanitizePluginCss("@keyframes spin{to{transform:rotate(1turn)}}html{animation:spin 2s linear infinite}"), /spin/);
    assert.match(sanitizePluginCss(".note{animation:q 0s forwards}@keyframes q{to{opacity:0}}"), /animation/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("html{color:red;&{display:none;color:blue}}")), false);
    assert.match(sanitizePluginCss("html{color:red;&{display:none;color:blue}}"), /blue/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss(":nth-child(2n){display:none}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss(":not(.note){display:none;color:red}")), false);
    assert.match(sanitizePluginCss(":not(.note){display:none;color:red}"), /red/);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:0e0;color:#112233}")), false);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:0E+2;color:#112233}")), false);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:.0e1;color:#112233}")), false);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:-0;color:#112233}")), false);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:0e-1;color:#112233}")), false);
    assert.match(sanitizePluginCss("html{opacity:0e0;color:#112233}"), /#112233/);
    assert.match(sanitizePluginCss("html{opacity:1e-1;color:#112233}"), /1e-1/);
    assert.match(sanitizePluginCss("html{opacity:calc(0.5)}"), /calc\(0\.5\)/);
    assert.equal(/zoom/i.test(sanitizePluginCss("html{zoom:0e0;color:#112233}")), false);
    assert.equal(/scale\s*\(\s*0e0/i.test(sanitizePluginCss("html{transform:scale(0e0);color:#112233}")), false);
    assert.match(sanitizePluginCss("html{transform:scale(-1);color:#112233}"), /scale\(-1\)/);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:sign(0);color:#112233}")), false);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:sign(-1);color:#112233}")), false);
    assert.match(sanitizePluginCss("html{opacity:sign(-1);color:#112233}"), /#112233/);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:round(0, 1);color:#112233}")), false);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:round(down, 0.2, 1);color:#112233}")), false);
    assert.match(sanitizePluginCss("html{opacity:round(nearest, 0.6, 1)}"), /round/);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:mod(0, 1);color:#112233}")), false);
    assert.match(sanitizePluginCss("html{opacity:mod(5, 3)}"), /mod/);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:rem(0, 1);color:#112233}")), false);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:hypot(0, 0);color:#112233}")), false);
    assert.match(sanitizePluginCss("html{opacity:hypot(3, 4)}"), /hypot/);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:pow(0, 1);color:#112233}")), false);
    assert.match(sanitizePluginCss("html{opacity:pow(0, 0)}"), /pow/);
    assert.match(sanitizePluginCss("html{opacity:pow(2, 3)}"), /pow/);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:log(1);color:#112233}")), false);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:log(1, 10);color:#112233}")), false);
    assert.match(sanitizePluginCss("html{opacity:log(10)}"), /log/);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:sqrt(0);color:#112233}")), false);
    assert.match(sanitizePluginCss("html{opacity:sqrt(4)}"), /sqrt/);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:sin(0);color:#112233}")), false);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:sin(180deg);color:#112233}")), false);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:sin(pi);color:#112233}")), false);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:cos(90deg);color:#112233}")), false);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:tan(0);color:#112233}")), false);
    assert.match(sanitizePluginCss("html{opacity:sin(90deg);color:#112233}"), /sin\(90deg\)/);
    assert.match(sanitizePluginCss("html{opacity:cos(0);color:#112233}"), /cos\(0\)/);
    assert.match(sanitizePluginCss("html{opacity:tan(90deg)}"), /tan/);
    assert.match(sanitizePluginCss("html{opacity:exp(0)}"), /exp/);
    assert.equal(/opacity\s*:\s*var\(\s*--o\s*\)/i.test(sanitizePluginCss("html{--o:sign(0);opacity:var(--o);color:#112233}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("*|*{display:none;color:red}")), false);
    assert.match(sanitizePluginCss("*|*{display:none;color:red}"), /red/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("*|* *|*{display:none}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("*|* > *|*{display:none}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("*|*+*|*{display:none}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("@media all{*|*{display:none;color:red}}")), false);
    assert.match(sanitizePluginCss("@media all{*|*{display:none;color:red}}"), /red/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("*|*{color:red;&{display:none;color:blue}}")), false);
    assert.match(sanitizePluginCss("*|*{color:red;&{display:none;color:blue}}"), /blue/);
    assert.match(sanitizePluginCss(".note{display:none}"), /display:\s*none/);
    assert.match(sanitizePluginCss("* .note{display:none}"), /display:\s*none/);
    assert.match(sanitizePluginCss("*|*.note{display:none}"), /display:\s*none/);
    assert.match(sanitizePluginCss(".desk{position:fixed;top:0}"), /fixed/);
    assert.match(sanitizePluginCss("html{filter:grayscale(1)}"), /grayscale/);
    assert.match(sanitizePluginCss("html{transform:rotate(2deg)}"), /rotate\(2deg\)/);
    assert.match(sanitizePluginCss("html{opacity:max(0, 1)}"), /max\(0,\s*1\)/);
    assert.match(sanitizePluginCss("html{opacity:clamp(0, 0.5, 1)}"), /clamp/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss(":nth-child(2n + 1){display:none;color:red}")), false);
    assert.match(sanitizePluginCss(":nth-child(2n + 1){display:none;color:red}"), /red/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss(":nth-child(n of *){display:none}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("head + body{display:none;color:red}")), false);
    assert.match(sanitizePluginCss("head + body{display:none;color:red}"), /red/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("html>*{display:none;color:red}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("[data-theme]{display:none;color:red}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("[lang=en]{display:none;color:red}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss(".antialiased{display:none;color:red}")), false);
    assert.match(sanitizePluginCss(".antialiased{display:none;color:red}"), /red/);
    assert.match(sanitizePluginCss("html .note{display:none;color:red}"), /display:\s*none/);
    assert.match(sanitizePluginCss("html[data-theme] .note{display:none;color:red}"), /display:\s*none/);
    assert.match(sanitizePluginCss(".antialiased .note{display:none}"), /display:\s*none/);
    assert.match(sanitizePluginCss("[contenteditable]{display:none}"), /display:\s*none/);
    assert.equal(/opacity\s*:\s*var\(\s*--o\s*\)/i.test(sanitizePluginCss('@property --o { syntax: "<number>"; inherits: true; initial-value: 0; } html { opacity: var(--o); color: red }')), false);
    assert.match(sanitizePluginCss('@property --o { syntax: "<number>"; inherits: true; initial-value: 0; } html { opacity: var(--o); color: red }'), /red/);
    assert.equal(/display\s*:\s*var\(\s*--d\s*\)/i.test(sanitizePluginCss('@property --d { syntax: "*"; inherits: true; initial-value: none; } html { display: var(--d); color: red }')), false);
    assert.match(sanitizePluginCss('@property --o { syntax: "<number>"; inherits: true; initial-value: 0; } html { --o: 0.5; opacity: var(--o) }'), /0\.5/);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:calc(1 / infinity);color:#112233}")), false);
    assert.match(sanitizePluginCss("html{opacity:calc(1 / infinity);color:#112233}"), /#112233/);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:min(infinity, 0);color:#112233}")), false);
    assert.match(sanitizePluginCss("html{opacity:min(infinity, 1)}"), /min/);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:exp(-infinity);color:#112233}")), false);
    assert.match(sanitizePluginCss("html{opacity:exp(0)}"), /exp/);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:calc(e - e);color:#112233}")), false);
    assert.match(sanitizePluginCss("html{opacity:calc(e)}"), /calc/);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:asin(0);color:#112233}")), false);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:calc(asin(0) / 1rad);color:#112233}")), false);
    assert.match(sanitizePluginCss("html{opacity:sin(90deg)}"), /sin\(90deg\)/);
    assert.match(sanitizePluginCss("html{opacity:acos(0)}"), /acos/);
    assert.equal(/clip-path/i.test(sanitizePluginCss("html{clip-path:inset(100%);color:red}")), false);
    assert.match(sanitizePluginCss("html{clip-path:inset(100%);color:red}"), /red/);
    assert.equal(/clip-path/i.test(sanitizePluginCss("html{clip-path:inset(50%)}")), false);
    assert.match(sanitizePluginCss("html{clip-path:inset(10%)}"), /inset/);
    assert.equal(/clip-path/i.test(sanitizePluginCss("html{clip-path:circle(0px);color:red}")), false);
    assert.match(sanitizePluginCss("html{clip-path:circle(0px);color:red}"), /red/);
    assert.match(sanitizePluginCss("html{clip-path:circle(40%)}"), /circle/);
    assert.match(sanitizePluginCss(".note{clip-path:circle(0)}"), /circle/);
    assert.equal(/rotateY/i.test(sanitizePluginCss("html{transform:rotateY(90deg);color:red}")), false);
    assert.match(sanitizePluginCss("html{transform:rotateY(90deg);color:red}"), /red/);
    assert.match(sanitizePluginCss("html{filter:grayscale(1)}"), /grayscale/);
    assert.match(sanitizePluginCss(".desk{position:fixed;top:0}"), /fixed/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("body > *{display:none;color:red}")), false);
    assert.match(sanitizePluginCss("body > *{display:none;color:red}"), /red/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("body *{display:none;color:red}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("body>*{display:none}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("body > * > *{display:none;color:red}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss(":is(body > *){display:none;color:red}")), false);
    assert.match(sanitizePluginCss(":is(body > *){display:none;color:red}"), /red/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss(":where(body > *){display:none}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("html{& > *{display:none;color:blue}}")), false);
    assert.match(sanitizePluginCss("html{& > *{display:none;color:blue}}"), /blue/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("@media all{body > *{display:none;color:red}}")), false);
    assert.match(sanitizePluginCss("html .note{display:none;color:red}"), /display:\s*none/);
    assert.match(sanitizePluginCss(".note-body{display:none}"), /display:\s*none/);
    assert.match(sanitizePluginCss(".body{display:none}"), /display:\s*none/);
    assert.match(sanitizePluginCss("body.note{display:none}"), /display:\s*none/);
    assert.match(sanitizePluginCss("html{&.note{display:none}}"), /display:\s*none/);
    assert.match(sanitizePluginCss(".note{&{display:none}}"), /display:\s*none/);
    assert.match(sanitizePluginCss("body:hover{display:none}"), /display:\s*none/);
    assert.match(sanitizePluginCss("body > .note{display:none}"), /display:\s*none/);
    assert.match(sanitizePluginCss("body > div{display:none}"), /display:\s*none/);
    assert.match(sanitizePluginCss("div{display:none}"), /display:\s*none/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("body > *:not(.note){display:none;color:red}")), false);
    assert.match(sanitizePluginCss("body > *:not(.note){display:none;color:red}"), /red/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("body > :not(.note){display:none}")), false);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:sin(atan2(0, -1));color:#112233}")), false);
    assert.match(sanitizePluginCss("html{opacity:sin(atan2(0, -1));color:#112233}"), /#112233/);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:sin(acos(-1));color:#112233}")), false);
    assert.equal(/opacity\s*\(\s*sin/i.test(sanitizePluginCss("html{filter:opacity(sin(atan2(0, -1)));color:red}")), false);
    assert.match(sanitizePluginCss("html{filter:opacity(sin(atan2(0, -1)));color:red}"), /red/);
    assert.equal(/scale\s*\(\s*sin/i.test(sanitizePluginCss("html{transform:scale(sin(atan2(0, -1)));color:red}")), false);
    assert.match(sanitizePluginCss("html{transform:scale(sin(atan2(0, -1)));color:red}"), /red/);
    assert.match(sanitizePluginCss("html{opacity:cos(asin(0))}"), /cos\(asin\(0\)\)/);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:cos(atan2(0, -1));color:#112233}")), false);
    assert.match(sanitizePluginCss("html{opacity:cos(atan2(0, -1));color:#112233}"), /#112233/);
    assert.match(sanitizePluginCss("html{opacity:exp(0)}"), /exp/);
    assert.match(sanitizePluginCss("html{transform:rotate(asin(0))}"), /rotate/);
    assert.equal(/clip-path/i.test(sanitizePluginCss("html{clip-path:polygon(0 0, 0 0, 0 0);color:red}")), false);
    assert.match(sanitizePluginCss("html{clip-path:polygon(0 0, 0 0, 0 0);color:red}"), /red/);
    assert.equal(/clip-path/i.test(sanitizePluginCss("html{clip-path:polygon(0% 0%, 0% 0%, 0% 0%)}")), false);
    assert.equal(/clip-path/i.test(sanitizePluginCss("html{clip-path:polygon(evenodd, 0 0, 0 0, 0 0)}")), false);
    assert.equal(/clip-path/i.test(sanitizePluginCss("html{clip-path:xywh(0 0 0 0);color:red}")), false);
    assert.match(sanitizePluginCss("html{clip-path:xywh(0 0 0 0);color:red}"), /red/);
    assert.equal(/clip-path/i.test(sanitizePluginCss("html{clip-path:xywh(0, 0, 0, 10px)}")), false);
    assert.equal(/clip-path/i.test(sanitizePluginCss("html{clip-path:rect(0 0 0 0)}")), false);
    assert.equal(/clip-path/i.test(sanitizePluginCss("html{--c:polygon(0 0, 0 0, 0 0);clip-path:var(--c);color:red}")), false);
    assert.match(sanitizePluginCss("html{--c:polygon(0 0, 0 0, 0 0);clip-path:var(--c);color:red}"), /red/);
    assert.match(sanitizePluginCss("html{clip-path:polygon(0 0, 100 0, 0 100)}"), /polygon/);
    assert.match(sanitizePluginCss("html{clip-path:circle(40%)}"), /circle/);
    assert.match(sanitizePluginCss("html{clip-path:rect(0px, 10px, 10px, 0px)}"), /rect/);
    assert.match(sanitizePluginCss("html{clip-path:inset(100px)}"), /inset/);
    assert.match(sanitizePluginCss(".note{clip-path:polygon(0 0, 0 0, 0 0)}"), /polygon/);
    assert.equal(/clip-path/i.test(sanitizePluginCss("html{clip-path:path('M0 0');color:red}")), false);
    assert.match(sanitizePluginCss("html{clip-path:path('M0 0');color:red}"), /red/);
    assert.match(sanitizePluginCss("html{clip-path:path('M0 0 L 10 0 L 0 10 Z')}"), /path/);
    assert.match(sanitizePluginCss(".note{clip-path:path('M0 0')}"), /path/);
    assert.match(sanitizePluginCss("html{--c:circle(40%);clip-path:var(--c)}"), /var\(--c\)/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("@scope (html){:scope{display:none;color:red}}")), false);
    assert.match(sanitizePluginCss("@scope (html){:scope{display:none;color:red}}"), /red/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("@scope (body){:scope{display:none}}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("@scope (:root){:scope{display:none}}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("@scope (*){:scope{display:none;color:red}}")), false);
    assert.match(sanitizePluginCss("@scope (*){:scope{display:none;color:red}}"), /red/);
    assert.match(sanitizePluginCss("@scope (.note){:scope{display:none;color:red}}"), /display:\s*none/);
    assert.match(sanitizePluginCss("@scope (html){.note{display:none;color:red}}"), /display:\s*none/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("@scope (html) to (.note){:scope{display:none;color:red}}")), false);
    assert.equal(/opacity\s*:\s*0/.test(sanitizePluginCss("@starting-style{html{opacity:0;color:red}}")), false);
    assert.match(sanitizePluginCss("@starting-style{html{opacity:0;color:red}}"), /red/);
    assert.equal(/opacity\s*:\s*0/.test(sanitizePluginCss("html{color:red;@starting-style{opacity:0;color:blue}}")), false);
    assert.match(sanitizePluginCss("html{color:red;@starting-style{opacity:0;color:blue}}"), /blue/);
    assert.match(sanitizePluginCss("@starting-style{.note{opacity:0}}"), /opacity:\s*0/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("html{@media all{display:none;color:red}}")), false);
    assert.match(sanitizePluginCss("html{@media all{display:none;color:red}}"), /red/);
    assert.match(sanitizePluginCss("html{@media all{.note{display:none}}}"), /display:\s*none/);
    assert.equal(/opacity\s*:/.test(sanitizePluginCss("html{opacity:sin(pi * 1rad);color:#112233}")), false);
    assert.match(sanitizePluginCss("html{opacity:sin(pi * 1rad);color:#112233}"), /#112233/);
    assert.equal(/opacity\s*:/.test(sanitizePluginCss("html{opacity:cos(pi * 1rad / 2);color:#112233}")), false);
    assert.equal(/opacity\s*:/.test(sanitizePluginCss("html{opacity:sin(2 * pi * 1rad);color:#112233}")), false);
    assert.equal(/opacity\s*\(/.test(sanitizePluginCss("html{filter:opacity(sin(pi * 1rad));color:red}")), false);
    assert.match(sanitizePluginCss("html{filter:opacity(sin(pi * 1rad));color:red}"), /red/);
    assert.equal(/zoom\s*:/.test(sanitizePluginCss("html{zoom:sin(pi * 1rad);color:red}")), false);
    assert.match(sanitizePluginCss("html{zoom:sin(pi * 1rad);color:red}"), /red/);
    assert.match(sanitizePluginCss(".note{opacity:sin(pi * 1rad)}"), /sin/);
    assert.match(sanitizePluginCss("html{opacity:sin(90deg)}"), /sin\(90deg\)/);
    assert.match(sanitizePluginCss("html{opacity:exp(0)}"), /exp/);
    assert.match(sanitizePluginCss("html{opacity:cos(asin(0))}"), /cos\(asin\(0\)\)/);
    assert.equal(/\bclip\s*:/.test(sanitizePluginCss("html{position:absolute;clip:rect(0px, 0px, 0px, 0px);color:red}")), false);
    assert.match(sanitizePluginCss("html{position:absolute;clip:rect(0px, 0px, 0px, 0px);color:red}"), /absolute/);
    assert.match(sanitizePluginCss("html{position:absolute;clip:rect(0px, 0px, 0px, 0px);color:red}"), /red/);
    assert.match(sanitizePluginCss("html{clip:rect(0px, 40px, 40px, 0px)}"), /rect/);
    assert.equal(/shape\s*\(/.test(sanitizePluginCss("html{clip-path:shape(from 0 0, line to 0 0, close);color:red}")), false);
    assert.match(sanitizePluginCss("html{clip-path:shape(from 0 0, line to 0 0, close);color:red}"), /red/);
    assert.match(sanitizePluginCss("html{clip-path:shape(from 0px 0px, line to 10px 0px, line to 0px 10px, close)}"), /shape/);
    assert.match(sanitizePluginCss("html{clip-path:shape(from 0 0, curve to 10px 0 with 0 0, close)}"), /shape/);
    assert.match(sanitizePluginCss(".note{clip-path:shape(from 0 0, line to 0 0, close)}"), /shape/);
    assert.equal(/height\s*:\s*0/.test(sanitizePluginCss("html{height:0;overflow:hidden;color:red}")), false);
    assert.equal(/overflow\s*:\s*hidden/.test(sanitizePluginCss("html{height:0;overflow:hidden;color:red}")), false);
    assert.match(sanitizePluginCss("html{height:0;overflow:hidden;color:red}"), /red/);
    assert.match(sanitizePluginCss("html{height:100%;overflow:hidden}"), /height:\s*100%/);
    assert.match(sanitizePluginCss("html{height:100%;overflow:hidden}"), /overflow:\s*hidden/);
    assert.match(sanitizePluginCss(".note{height:0;overflow:hidden}"), /height:\s*0/);
    assert.match(sanitizePluginCss(".note{height:0;overflow:hidden}"), /overflow:\s*hidden/);
    assert.match(sanitizePluginCss(".desk{position:fixed;top:0}"), /fixed/);
    assert.match(sanitizePluginCss("html{filter:grayscale(1)}"), /grayscale/);
    assert.match(sanitizePluginCss("html{transform:rotate(2deg)}"), /rotate/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss(":scope{display:none;color:red}")), false);
    assert.match(sanitizePluginCss(":scope{display:none;color:red}"), /red/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("html:scope{display:none;color:red}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss(":defined{display:none;color:red}")), false);
    assert.match(sanitizePluginCss(":defined{display:none;color:red}"), /red/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("html:read-only{display:none;color:red}")), false);
    assert.match(sanitizePluginCss("div:read-only{display:none}"), /display:\s*none/);
    assert.match(sanitizePluginCss("div:defined{display:none}"), /display:\s*none/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("body:nth-child(1 of body){display:none;color:red}")), false);
    assert.match(sanitizePluginCss("body:nth-child(1 of body){display:none;color:red}"), /red/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("body:nth-child(odd of body){display:none}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss(":nth-child(n of *){display:none}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("html:not(:has(#quire-missing)){display:none;color:red}")), false);
    assert.match(sanitizePluginCss("html:not(:has(#quire-missing)){display:none;color:red}"), /red/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("html:has(body){display:none}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("body:has(div){display:none}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("html:not(:lang(fr)){display:none;color:red}")), false);
    assert.match(sanitizePluginCss("html:not(:lang(fr)){display:none;color:red}"), /red/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("html:lang(en){display:none}")), false);
    assert.match(sanitizePluginCss("html:not(:lang(en)){display:none}"), /display:\s*none/);
    assert.match(sanitizePluginCss("html .note{display:none}"), /display:\s*none/);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:if(media(min-width: 0px): 0; else: 1);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(min-width: 0px): 0; else: 1);color:red}"), /red/);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:if(supports(display: flex): 0; else: 1)}")), false);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:if(else: 0);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(max-width: 0px): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(min-width: 0px): 0.5; else: 0)}"), /0\.5/);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:calc(sibling-index() - sibling-index());color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:calc(sibling-index() - sibling-index());color:red}"), /red/);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:min(sibling-index(), 0)}")), false);
    assert.match(sanitizePluginCss("html{opacity:calc(sibling-index() / sibling-index())}"), /sibling-index/);
    assert.equal(/clip-path/i.test(sanitizePluginCss("html{clip-path:inset(100% 0);color:red}")), false);
    assert.match(sanitizePluginCss("html{clip-path:inset(100% 0);color:red}"), /red/);
    assert.equal(/clip-path/i.test(sanitizePluginCss("html{clip-path:inset(0 100%)}")), false);
    assert.match(sanitizePluginCss("html{clip-path:inset(10% 0)}"), /inset/);
    assert.match(sanitizePluginCss("html{clip-path:inset(100px)}"), /inset/);
    assert.equal(/mask-image/i.test(sanitizePluginCss("html{mask-image:linear-gradient(transparent, transparent);color:red}")), false);
    assert.match(sanitizePluginCss("html{mask-image:linear-gradient(transparent, transparent);color:red}"), /red/);
    assert.equal(/mask-image/i.test(sanitizePluginCss("html{mask-image:linear-gradient(#0000, #0000)}")), false);
    assert.match(sanitizePluginCss("html{mask-image:linear-gradient(black, transparent)}"), /black/);
    assert.match(sanitizePluginCss(".note{mask-image:linear-gradient(transparent, transparent)}"), /transparent/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss(":dir(ltr){display:none;color:red}")), false);
    assert.match(sanitizePluginCss(":dir(ltr){display:none;color:red}"), /red/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("html:dir(ltr){display:none;color:red}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("body:dir(ltr){display:none}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("html:is(:dir(ltr)){display:none}")), false);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss(":nth-child(1 of :dir(ltr)){display:none;color:red}")), false);
    assert.match(sanitizePluginCss(":nth-child(1 of :dir(ltr)){display:none;color:red}"), /red/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("@media all{:dir(ltr){display:none;color:red}}")), false);
    assert.match(sanitizePluginCss(":dir(rtl){display:none}"), /display:\s*none/);
    assert.match(sanitizePluginCss(".note:dir(ltr){display:none}"), /display:\s*none/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss('[lang="EN" i]{display:none;color:red}')), false);
    assert.match(sanitizePluginCss('[lang="EN" i]{display:none;color:red}'), /red/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("[lang=EN i]{display:none}")), false);
    assert.match(sanitizePluginCss("[lang=EN]{display:none}"), /display:\s*none/);
    assert.match(sanitizePluginCss("[lang=EN s]{display:none}"), /display:\s*none/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("html { @scope (&) { :scope { display: none; color: red } } }")), false);
    assert.match(sanitizePluginCss("html { @scope (&) { :scope { display: none; color: red } } }"), /red/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("@scope (html) { & { display: none; color: red } }")), false);
    assert.match(sanitizePluginCss("@scope (html) { & { display: none; color: red } }"), /red/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("@scope (html) { & > * { display: none; color: red } }")), false);
    assert.match(sanitizePluginCss("@scope (html) { & > * { display: none; color: red } }"), /red/);
    assert.match(sanitizePluginCss("@scope (.note) { & { display: none; color: red } }"), /display:\s*none/);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:if(supports(color: red): 0; else: 1);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(supports(color: red): 0; else: 1);color:red}"), /red/);
    assert.match(sanitizePluginCss("html{opacity:if(supports(color: red): 0.5; else: 0)}"), /0\.5/);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{opacity:if(style(--x: 1): 1; else: 0);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(style(--x: 1): 1; else: 0);color:red}"), /red/);
    assert.equal(/opacity/i.test(sanitizePluginCss("html{--x:1;opacity:if(style(--x: 1): 0; else: 1);color:red}")), false);
    assert.match(sanitizePluginCss("html{--x:2;opacity:if(style(--x: 1): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{--x:1;opacity:if(style(--x: 1): 0.5; else: 0)}"), /0\.5/);
    assert.equal(/mask-image/i.test(sanitizePluginCss("html{mask-image:linear-gradient(color(srgb 0 0 0 / 0), color(srgb 0 0 0 / 0));color:red}")), false);
    assert.match(sanitizePluginCss("html{mask-image:linear-gradient(color(srgb 0 0 0 / 0), color(srgb 0 0 0 / 0));color:red}"), /red/);
    assert.equal(/mask-image/i.test(sanitizePluginCss("html{mask-image:linear-gradient(oklch(0 0 0 / 0), oklch(0 0 0 / 0))}")), false);
    assert.equal(/mask-image/i.test(sanitizePluginCss("html{mask-image:linear-gradient(lab(0% 0 0 / 0), lab(0% 0 0 / 0))}")), false);
    assert.equal(/mask-image/i.test(sanitizePluginCss("html{mask-image:linear-gradient(lch(0% 0 0 / 0), lch(0% 0 0 / 0))}")), false);
    assert.equal(/mask-image/i.test(sanitizePluginCss("html{mask-image:linear-gradient(color-mix(in srgb, transparent, transparent), transparent);color:red}")), false);
    assert.match(sanitizePluginCss("html{mask-image:linear-gradient(color-mix(in srgb, transparent, transparent), transparent);color:red}"), /red/);
    assert.equal(/mask-image/i.test(sanitizePluginCss("html{mask-image:linear-gradient(light-dark(transparent, transparent), light-dark(transparent, transparent))}")), false);
    assert.match(sanitizePluginCss("html{mask-image:linear-gradient(light-dark(black, transparent), black)}"), /black/);
    assert.match(sanitizePluginCss("html{mask-image:linear-gradient(color(srgb 1 0 0), transparent)}"), /color/);
    assert.match(sanitizePluginCss(".note{mask-image:linear-gradient(color(srgb 0 0 0 / 0), color(srgb 0 0 0 / 0))}"), /color/);
    assert.equal(/clip-path/i.test(sanitizePluginCss("html{clip-path:inset(calc(100%));color:red}")), false);
    assert.match(sanitizePluginCss("html{clip-path:inset(calc(100%));color:red}"), /red/);
    assert.equal(/clip-path/i.test(sanitizePluginCss("html{clip-path:inset(calc(50% + 50%) 0)}")), false);
    assert.equal(/clip-path/i.test(sanitizePluginCss("html{clip-path:inset(calc(100% + 0px))}")), false);
    assert.match(sanitizePluginCss("html{clip-path:inset(calc(10%))}"), /inset/);
    assert.match(sanitizePluginCss("html{clip-path:inset(calc(100px))}"), /inset/);
    assert.equal(/clip-path/i.test(sanitizePluginCss("html{clip-path:polygon(0 0, 10px 0, 20px 0);color:red}")), false);
    assert.match(sanitizePluginCss("html{clip-path:polygon(0 0, 10px 0, 20px 0);color:red}"), /red/);
    assert.match(sanitizePluginCss("html{clip-path:polygon(0 0, 100px 0, 0 100px)}"), /polygon/);
    assert.match(sanitizePluginCss("@scope (.note){:scope{display:none}}"), /display:\s*none/);
    assert.match(sanitizePluginCss(".desk{position:fixed;top:0}"), /fixed/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss("html:lang(en, fr){display:none;color:red}")), false);
    assert.match(sanitizePluginCss("html:lang(en, fr){display:none;color:red}"), /red/);
    assert.equal(/display\s*:\s*[^;}]*\bnone\b/i.test(sanitizePluginCss('html:lang("en", "fr"){display:none}')), false);
    assert.match(sanitizePluginCss("html:lang(fr, de){display:none}"), /display:\s*none/);
    assert.match(sanitizePluginCss("html:not(:lang(en)){display:none}"), /display:\s*none/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:-1;color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:-1;color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:-1%;color:red}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:calc(0 - 1);color:red}")), false);
    assert.equal(/opacity\s*\(/i.test(sanitizePluginCss("html{filter:opacity(-1);color:red}")), false);
    assert.match(sanitizePluginCss("html{filter:opacity(-1);color:red}"), /red/);
    assert.equal(/brightness\s*\(/i.test(sanitizePluginCss("html{filter:brightness(-1);color:red}")), false);
    assert.equal(/contrast\s*\(/i.test(sanitizePluginCss("html{filter:contrast(-1%);color:red}")), false);
    assert.match(sanitizePluginCss("html{filter:brightness(1)}"), /brightness\(1\)/);
    assert.match(sanitizePluginCss("html{transform:scale(-1)}"), /scale\(-1\)/);
    assert.match(sanitizePluginCss("html{zoom:-1}"), /zoom:\s*-1/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss(":root{--o:-1}html{opacity:var(--o);color:red}")), false);
    assert.match(sanitizePluginCss(":root{--o:-1}html{opacity:var(--o);color:red}"), /red/);
    assert.match(sanitizePluginCss(":root{--o:-1}html{transform:scale(var(--o))}"), /scale/);
    assert.match(sanitizePluginCss(".note{opacity:-1}"), /opacity:\s*-1/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:calc(sibling-index() - sibling-count());color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:calc(sibling-index() - sibling-count());color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("body{opacity:calc(sibling-index() - sibling-count())}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:calc(sibling-index() - 1);color:red}")), false);
    assert.match(sanitizePluginCss("body{opacity:calc(sibling-index() - 1)}"), /sibling-index/);
    assert.match(sanitizePluginCss(".note{opacity:calc(sibling-index() - 1)}"), /sibling-index/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("*{opacity:calc(sibling-index() - 1);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:calc(sibling-index() / sibling-index())}"), /sibling-index/);
    assert.equal(/height\s*:/i.test(sanitizePluginCss("html{height:calc(sibling-index() - 1);overflow:hidden;color:red}")), false);
    assert.equal(/overflow\s*:/i.test(sanitizePluginCss("html{height:calc(sibling-index() - 1);overflow:hidden;color:red}")), false);
    assert.match(sanitizePluginCss("body{height:calc(sibling-index() - 1);overflow:hidden}"), /height/);
    assert.match(sanitizePluginCss("body{height:calc(sibling-index() - 1);overflow:hidden}"), /overflow/);
    assert.match(sanitizePluginCss("body > *{opacity:calc(sibling-index() - 1)}"), /sibling-index/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(display: inline-flex): 0; else: 1);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(supports(display: inline-flex): 0; else: 1);color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(display: inline-grid): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(color: color(srgb 1 0 0)): 0; else: 1);color:red}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(color: oklch(0.5 0.1 30)): 0; else: 1)}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(supports(color: not-a-color): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(supports(display: inline-flex): 0.5; else: 0)}"), /0\.5/);
    assert.equal(/mask-image/i.test(sanitizePluginCss("html{mask-image:linear-gradient(rgb(0 0 0 / none), rgb(0 0 0 / none));color:red}")), false);
    assert.match(sanitizePluginCss("html{mask-image:linear-gradient(rgb(0 0 0 / none), rgb(0 0 0 / none));color:red}"), /red/);
    assert.equal(/mask-image/i.test(sanitizePluginCss("html{mask-image:linear-gradient(color(srgb 0 0 0 / none), transparent)}")), false);
    assert.match(sanitizePluginCss("html{mask-image:linear-gradient(rgb(0 0 0 / none), black)}"), /black/);
    assert.match(sanitizePluginCss(".note{mask-image:linear-gradient(rgb(0 0 0 / none), rgb(0 0 0 / none))}"), /none/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(display: table-cell): 0; else: 1);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(supports(display: table-cell): 0; else: 1);color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(position: relative): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(overflow: hidden): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports((display: flex)): 0; else: 1);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(supports((display: flex)): 0; else: 1);color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(selector(:root)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(display: flex) and supports(display: grid): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(width: 1px): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(width: 2px): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(font-size: 16px): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(color: Canvas): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(aspect-ratio: 1 / 1): 0; else: 1)}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(supports(display: no-such): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(supports(display: table-cell): 0.5; else: 0)}"), /0\.5/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-width: 0em): 0; else: 1);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(min-width: 0em): 0; else: 1);color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-width: 0vw): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media((min-width: 0px)): 0; else: 1)}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(all): 0; else: 1)}"), /if/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(all): 1; else: 0)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-width: 0px) and media(min-height: 0px): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media((min-width: 0px) and (min-height: 0px)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(0px <= width): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(scripting: enabled): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(grid: 0): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-color: 0): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-resolution: 0dpi): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(not media(max-width: 0px): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(max-width: 0px): 1; else: 0);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(max-width: 0px): 1; else: 0);color:red}"), /red/);
    assert.match(sanitizePluginCss("html{opacity:if(media(max-width: 0px): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(min-width: 10px): 0; else: 1)}"), /if/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:progress(0, 0, 1);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:progress(0, 0, 1);color:red}"), /red/);
    assert.equal(/opacity\s*\(/i.test(sanitizePluginCss("html{filter:opacity(progress(0, 0, 1));color:red}")), false);
    assert.equal(/zoom\s*:/i.test(sanitizePluginCss("html{zoom:progress(0, 0, 1)}")), false);
    assert.match(sanitizePluginCss("html{opacity:progress(1, 0, 2)}"), /progress/);
    assert.match(sanitizePluginCss(".note{opacity:progress(0, 0, 1)}"), /progress/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{--o:progress(0, 0, 1);opacity:var(--o);color:red}")), false);
    assert.equal(/mask-image/i.test(sanitizePluginCss("html{mask-image:linear-gradient(rgb(0, 0, 0, 0), rgb(0, 0, 0, 0));color:red}")), false);
    assert.match(sanitizePluginCss("html{mask-image:linear-gradient(rgb(0, 0, 0, 0), rgb(0, 0, 0, 0));color:red}"), /red/);
    assert.equal(/mask-image/i.test(sanitizePluginCss("html{mask-image:linear-gradient(hsl(0, 0%, 0%, 0), hsl(0, 0%, 0%, 0))}")), false);
    assert.match(sanitizePluginCss("html{mask-image:linear-gradient(rgb(0, 0, 0), rgb(0, 0, 0))}"), /rgb/);
    assert.equal(/mask-image/i.test(sanitizePluginCss(":root{--c:linear-gradient(transparent, transparent)}html{mask-image:var(--c);color:red}")), false);
    assert.match(sanitizePluginCss(":root{--c:linear-gradient(transparent, transparent)}html{mask-image:var(--c);color:red}"), /red/);
    assert.match(sanitizePluginCss(".note{mask-image:var(--c)}:root{--c:linear-gradient(transparent, transparent)}"), /transparent/);
    assert.equal(/clip-path/i.test(sanitizePluginCss("html{clip-path:shape(from 0 0, line to 10px 0, line to 20px 0, close);color:red}")), false);
    assert.match(sanitizePluginCss("html{clip-path:shape(from 0 0, line to 10px 0, line to 20px 0, close);color:red}"), /red/);
    assert.match(sanitizePluginCss("html{clip-path:shape(from 0px 0px, line to 10px 0px, line to 0px 10px, close)}"), /shape/);
    assert.equal(/translate/i.test(sanitizePluginCss("html{transform:translate(-100%, 0);color:red}")), false);
    assert.match(sanitizePluginCss("html{transform:translate(-100%, 0);color:red}"), /red/);
    assert.equal(/translate/i.test(sanitizePluginCss("html{transform:translateX(-100%)}")), false);
    assert.equal(/translate/i.test(sanitizePluginCss("html{transform:translate3d(-100%, 0, 0)}")), false);
    assert.equal(/translate\s*:/i.test(sanitizePluginCss("html{translate:-100% 0;color:red}")), false);
    assert.match(sanitizePluginCss("html{translate:-100% 0;color:red}"), /red/);
    assert.equal(/translate/i.test(sanitizePluginCss("html{transform:translateX(-100vw)}")), false);
    assert.match(sanitizePluginCss("html{transform:translateX(4px)}"), /translateX/);
    assert.match(sanitizePluginCss("html{transform:rotate(2deg)}"), /rotate/);
    assert.match(sanitizePluginCss("html{transform:scale(-1)}"), /scale/);
    assert.match(sanitizePluginCss(".note{transform:translateX(-100%)}"), /translateX/);
    assert.match(sanitizePluginCss("html{opacity:if(media(screen): 0; else: 1);color:red}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(screen): 0; else: 1);color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(screen): 1; else: 0);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(screen): 1; else: 0);color:red}"), /red/);
    assert.match(sanitizePluginCss("html{opacity:if(media(only screen): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(not print): 0; else: 1)}"), /if/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(not print): 1; else: 0)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(print): 1; else: 0);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(print): 1; else: 0);color:red}"), /red/);
    assert.match(sanitizePluginCss("html{opacity:if(media(not speech): 0; else: 1)}"), /if/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(speech): 1; else: 0)}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(screen or print): 0; else: 1)}"), /if/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(screen or (min-width: 0px)): 1; else: 0)}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(screen and (min-width: 0px)): 0; else: 1)}"), /if/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(0px < width): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(width > 0px): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-monochrome: 0): 0; else: 1)}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(print): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(min-width: 10px): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{display:if(media(print): none; else: block)}"), /display/);
    assert.match(sanitizePluginCss("html{display:if(media(screen): none; else: block);color:red}"), /display/);
    assert.match(sanitizePluginCss("html{display:if(media(screen): none; else: block);color:red}"), /red/);
    assert.equal(/display\s*:/i.test(sanitizePluginCss("html{display:if(media(screen): block; else: none);color:red}")), false);
    assert.match(sanitizePluginCss("html{scale:if(media(screen): 0; else: 1)}"), /scale/);
    assert.match(sanitizePluginCss("html{zoom:if(media(not print): 0; else: 1)}"), /zoom/);
    assert.match(sanitizePluginCss("html{filter:opacity(if(media(screen): 0; else: 1));color:red}"), /opacity\s*\(/i);
    assert.match(sanitizePluginCss("html{filter:opacity(if(media(screen): 0; else: 1));color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(display: initial): 0; else: 1);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(supports(display: initial): 0; else: 1);color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(display: inherit): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(display: unset): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(display: revert): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(display: revert-layer): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(display: block !important): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(font-size: medium): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(width: fit-content): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(min-width: 0): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(max-width: none): 0; else: 1)}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(supports(display: no-such): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(supports(display: initial): 0.5; else: 0)}"), /0\.5/);
    assert.equal(/matrix/i.test(sanitizePluginCss("html{transform:matrix(1, 0, 0, 1, -100%, 0);color:red}")), false);
    assert.match(sanitizePluginCss("html{transform:matrix(1, 0, 0, 1, -100%, 0);color:red}"), /red/);
    assert.equal(/matrix3d/i.test(sanitizePluginCss("html{transform:matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,-100%,0,0,1)}")), false);
    assert.match(sanitizePluginCss("html{transform:matrix(1, 0, 0, 1, 4px, 0)}"), /matrix/);
    assert.equal(/translateX/i.test(sanitizePluginCss("html{transform:translateX(-100cqi);color:red}")), false);
    assert.match(sanitizePluginCss("html{transform:translateX(-100cqi);color:red}"), /red/);
    assert.equal(/translateY/i.test(sanitizePluginCss("html{transform:translateY(100cqb)}")), false);
    assert.match(sanitizePluginCss(".note{transform:matrix(1, 0, 0, 1, -100%, 0)}"), /matrix/);
    assert.match(sanitizePluginCss("html{opacity:if(media(screen, print): 0; else: 1);color:red}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(screen, print): 0; else: 1);color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(screen, print): 1; else: 0);color:red}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(print, speech): 1; else: 0);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(print, speech): 1; else: 0);color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media((orientation: portrait) or (orientation: landscape)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media((hover: hover) or (hover: none)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media((pointer: none) or (pointer: coarse) or (pointer: fine)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media((update: none) or (update: slow) or (update: fast)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media((overflow-block: none) or (overflow-block: scroll) or (overflow-block: optional-paged) or (overflow-block: paged)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media((overflow-inline: none) or (overflow-inline: scroll)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media((dynamic-range: standard) or (dynamic-range: high)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media((forced-colors: none) or (forced-colors: active)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media((prefers-reduced-motion: no-preference) or (prefers-reduced-motion: reduce)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media((prefers-color-scheme: light) or (prefers-color-scheme: dark)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media((prefers-contrast: no-preference) or (prefers-contrast: more) or (prefers-contrast: less) or (prefers-contrast: custom)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media((prefers-reduced-transparency: no-preference) or (prefers-reduced-transparency: reduce)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media((display-mode: browser) or (display-mode: fullscreen) or (display-mode: standalone) or (display-mode: minimal-ui) or (display-mode: window-controls-overlay) or (display-mode: picture-in-picture)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media((any-hover: hover) or (any-hover: none)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media((any-pointer: none) or (any-pointer: coarse) or (any-pointer: fine)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media((inverted-colors: none) or (inverted-colors: inverted)): 1; else: 0);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media((inverted-colors: none) or (inverted-colors: inverted)): 1; else: 0);color:red}"), /red/);
    assert.match(sanitizePluginCss("html{opacity:if(media((inverted-colors: none) or (inverted-colors: inverted)): 0; else: 1)}"), /if/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media((video-dynamic-range: standard) or (video-dynamic-range: high)): 1; else: 0)}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media((video-dynamic-range: standard) or (video-dynamic-range: high)): 0; else: 1)}"), /if/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media((prefers-reduced-data: no-preference) or (prefers-reduced-data: reduce)): 1; else: 0)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media((environment-blending: opaque) or (environment-blending: additive) or (environment-blending: subtractive)): 1; else: 0)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media((scan: interlace) or (scan: progressive)): 1; else: 0)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-width: 0cap): 0; else: 1);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(min-width: 0cap): 0; else: 1);color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-width: 0ic): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-height: 0lh): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(width >= 0rlh): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-width: 0rex): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(0rch <= width): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-color: 1): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(color >= 1): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(color > 0): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(not (monochrome)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(monochrome): 1; else: 0);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(monochrome): 1; else: 0);color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(color-gamut: srgb): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(resolution > 0dpi): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-resolution: 1dpi): 0; else: 1)}")), false);
    assert.match(sanitizePluginCss("html{zoom:if(media(screen, print): 0; else: 1)}"), /zoom/);
    assert.equal(/opacity\s*\(/i.test(sanitizePluginCss("html{filter:opacity(if(media(min-width: 0cap): 0; else: 1));color:red}")), false);
    assert.match(sanitizePluginCss("html{filter:opacity(if(media(min-width: 0cap): 0; else: 1));color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(not (display: block)): 1; else: 0);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(supports(not (display: block)): 1; else: 0);color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(not (display: no-such)): 0; else: 1)}")), false);
    assert.equal(/display\s*:/i.test(sanitizePluginCss("html{display:if(supports(not (display: block)): block; else: none);color:red}")), false);
    assert.match(sanitizePluginCss("html{display:if(supports(not (display: block)): block; else: none);color:red}"), /red/);
    assert.equal(/scale\s*:/i.test(sanitizePluginCss("html{scale:if(supports(not (display: flex)): 1; else: 0)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(font-size: .5em): 0; else: 1);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(supports(font-size: .5em): 0; else: 1);color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(width: .5px): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(font-size: 1ch): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(width: 1cap): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(font-size: 1lh): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(width: calc(1px)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(width: 1e2px): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(aspect-ratio: 1): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(box-sizing: border-box): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(transform: none): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(font-weight: 400): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(white-space: normal): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(display: none): 0; else: 1)}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(supports(display: no-such): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(supports(display: block): 0.5; else: 0)}"), /0\.5/);
    assert.match(sanitizePluginCss("html{opacity:if(supports(color: not-a-color): 0; else: 1)}"), /if/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(color: not-a-color): 1; else: 0);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(supports(color: not-a-color): 1; else: 0);color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(scripting): 0; else: 1);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(scripting): 0; else: 1);color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(not (scripting)): 1; else: 0);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(not (scripting)): 1; else: 0);color:red}"), /red/);
    assert.equal(/display\s*:/i.test(sanitizePluginCss("html{display:if(media(scripting): none; else: block);color:red}")), false);
    assert.match(sanitizePluginCss("html{display:if(media(scripting): none; else: block);color:red}"), /red/);
    assert.equal(/opacity\s*\(/i.test(sanitizePluginCss("html{filter:opacity(if(media(not (grid)): 0; else: 1));color:red}")), false);
    assert.match(sanitizePluginCss("html{filter:opacity(if(media(not (grid)): 0; else: 1));color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(grid): 1; else: 0)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(not (grid)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(monochrome: 0): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(monochrome = 0): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(0 = monochrome): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(color-index): 1; else: 0)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(not (color-index)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-color-index: 0): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(color-index: 0): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(max-color-index: 1): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(color-index >= 0): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(0 <= color-index): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(color-index <= 0): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(color-index < 1): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(dynamic-range): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(dynamic-range: standard): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(not (dynamic-range: high)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(dynamic-range: high): 1; else: 0);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(dynamic-range: high): 1; else: 0);color:red}"), /red/);
    assert.match(sanitizePluginCss("html{opacity:if(media(dynamic-range: high): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(color-index > 0): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(min-color-index: 1): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(grid = 0): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(hover): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(pointer): 0; else: 1)}"), /if/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(--x: 1): 0; else: 1);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(supports(--x: 1): 0; else: 1);color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(--x: banana): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(not (--x: 1)): 1; else: 0);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(supports(not (--x: 1)): 1; else: 0);color:red}"), /red/);
    assert.equal(/zoom\s*:/i.test(sanitizePluginCss("html{zoom:if(supports(--ink: 0): 0; else: 1)}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(supports(--x: 1): 0.5; else: 0)}"), /0\.5/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(font-family: serif): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(font-variant: normal): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(text-decoration: none): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(text-transform: none): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(letter-spacing: normal): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(word-spacing: normal): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(float: left): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(clear: both): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(flex-wrap: nowrap): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(order: 0): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(text-indent: 0): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(border-radius: 0): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(background-color: red): 0; else: 1);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(supports(background-color: red): 0; else: 1);color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(color: rgb(1 0 0 / 1)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(background-color: rgb(1 0 0 / 1)): 0; else: 1)}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(supports(display: no-such): 0; else: 1)}"), /if/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(resolution): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(monochrome >= 0): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(monochrome <= 0): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(0 <= monochrome): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(monochrome > 0): 1; else: 0)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(color >= 0): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(max-color: 100): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(color <= 32): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(aspect-ratio): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(aspect-ratio >= 0/1): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-aspect-ratio: 0/1): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(max-aspect-ratio: 0/1): 1; else: 0)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(horizontal-viewport-segments >= 1): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(vertical-viewport-segments > 0): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-device-width: 0px): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(device-aspect-ratio >= 0/1): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(max-device-width: 0px): 1; else: 0)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(resolution >= 0): 1; else: 0)}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(resolution >= 0): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(grid = 0): 0; else: 1)}"), /if/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(grid = 0): 1; else: 0)}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(min-resolution: 2dppx): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(hover): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(pointer): 0; else: 1)}"), /if/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(user-select: none): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(user-select: no-such): 1; else: 0)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(color-scheme: light dark): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(font-family: NotARealFont): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(flex: 1 1 auto): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(writing-mode: horizontal-tb): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(column-width: 10em): 0; else: 1)}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(supports(user-select: none): 0.5; else: 0)}"), /0\.5/);
    const previousCss = (globalThis as { CSS?: { supports?: (query: string) => boolean } }).CSS;
    (globalThis as { CSS?: { supports?: (query: string) => boolean } }).CSS = {
      supports: (query: string) => query.replace(/\s+/g, "") === "quirk-ink:1",
    };
    try {
      assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(quirk-ink: 1): 0; else: 1);color:red}")), false);
      assert.match(sanitizePluginCss("html{opacity:if(supports(quirk-ink: 1): 0; else: 1);color:red}"), /red/);
      assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(supports(quirk-ink: 0): 1; else: 0)}")), false);
      assert.match(sanitizePluginCss("html{opacity:if(supports(quirk-ink: 1): 0.5; else: 0)}"), /0\.5/);
    } finally {
      if (previousCss) (globalThis as { CSS?: { supports?: (query: string) => boolean } }).CSS = previousCss;
      else delete (globalThis as { CSS?: { supports?: (query: string) => boolean } }).CSS;
    }
    assert.match(sanitizePluginCss("html{opacity:if(supports(quirk-ink: 1): 0; else: 1)}"), /if/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(orientation): 0; else: 1);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(orientation): 0; else: 1);color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media((orientation)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(not (not (orientation))): 0; else: 1)}")), false);
    assert.equal(/display\s*:/i.test(sanitizePluginCss("html{display:if(media(display-mode): none; else: block);color:red}")), false);
    assert.match(sanitizePluginCss("html{display:if(media(display-mode): none; else: block);color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(prefers-color-scheme): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(color-gamut): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(width): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(height): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(device-width): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(device-height): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(device-width > 0px): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(0px < device-height): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(-webkit-device-pixel-ratio): 0; else: 1)}")), false);
    assert.equal(/zoom\s*:/i.test(sanitizePluginCss("html{zoom:if(media(not (not (width))): 0; else: 1)}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(orientation: landscape): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(display-mode: browser): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(prefers-color-scheme: light): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(hover): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(pointer): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(update): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(1px <= width): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(prefers-reduced-motion): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(color-gamut): 0.5; else: 0)}"), /0\.5/);
    assert.equal(/font-size\s*:/i.test(sanitizePluginCss("html{font-size:0;color:red}")), false);
    assert.match(sanitizePluginCss("html{font-size:0;color:red}"), /red/);
    assert.equal(/font-size\s*:/i.test(sanitizePluginCss(":root{font-size:0px}")), false);
    assert.equal(/font-size\s*:/i.test(sanitizePluginCss("html{font-size:0%}")), false);
    assert.equal(/font-size\s*:/i.test(sanitizePluginCss("html{font-size:0rem}")), false);
    assert.equal(/font-size\s*:/i.test(sanitizePluginCss("*{font-size:0;color:red}")), false);
    assert.match(sanitizePluginCss("*{font-size:0;color:red}"), /red/);
    assert.equal(/font-size\s*:/i.test(sanitizePluginCss("body{font-size:0}")), false);
    assert.equal(/font-size\s*:/i.test(sanitizePluginCss("html{font-size:if(media(min-width: 0px): 0px; else: 16px);color:red}")), false);
    assert.match(sanitizePluginCss("html{font-size:if(media(min-width: 0px): 0px; else: 16px);color:red}"), /red/);
    assert.equal(/font-size\s*:/i.test(sanitizePluginCss("html{--f:0;font-size:var(--f);color:red}")), false);
    assert.equal(/animation/i.test(sanitizePluginCss("@keyframes shrink{to{font-size:0}}html{animation:shrink 0s forwards;color:red}")), false);
    assert.match(sanitizePluginCss("@keyframes shrink{to{font-size:0}}html{animation:shrink 0s forwards;color:red}"), /red/);
    assert.match(sanitizePluginCss(".note{animation:shrink 0s forwards}@keyframes shrink{to{font-size:0}}"), /animation/);
    assert.match(sanitizePluginCss("html{font-size:18px}"), /18px/);
    assert.match(sanitizePluginCss("html{font-size:1.125rem}"), /1\.125rem/);
    assert.match(sanitizePluginCss("html{font-size:0.01px}"), /0\.01px/);
    assert.match(sanitizePluginCss(".note{font-size:0}"), /font-size:\s*0/);
    assert.match(sanitizePluginCss("html{font-size:if(media(print): 0px; else: 16px)}"), /font-size/);
    assert.equal(/rotateX/i.test(sanitizePluginCss("html{transform:rotateX(90deg);color:red}")), false);
    assert.match(sanitizePluginCss("html{transform:rotateX(90deg);color:red}"), /red/);
    assert.equal(/rotateY/i.test(sanitizePluginCss("body{transform:rotateY(0.25turn)}")), false);
    assert.equal(/rotateX/i.test(sanitizePluginCss(":root{transform:rotateX(100grad)}")), false);
    assert.equal(/rotate3d/i.test(sanitizePluginCss("html{transform:rotate3d(1, 0, 0, 90deg)}")), false);
    assert.equal(/rotateX/i.test(sanitizePluginCss("html{transform:rotateX(calc(pi * 1rad / 2))}")), false);
    assert.equal(/rotateX/i.test(sanitizePluginCss("*{transform:rotateX(90deg)}")), false);
    assert.match(sanitizePluginCss("html{transform:rotateZ(90deg)}"), /rotateZ/);
    assert.match(sanitizePluginCss("html{transform:rotate(2deg)}"), /rotate/);
    assert.match(sanitizePluginCss("html{transform:rotateX(89deg)}"), /89deg/);
    assert.equal(/skewX/i.test(sanitizePluginCss("html{transform:skewX(90deg);color:red}")), false);
    assert.match(sanitizePluginCss("html{transform:skewX(90deg);color:red}"), /red/);
    assert.equal(/skew/i.test(sanitizePluginCss("html{transform:skew(45deg, 45deg)}")), false);
    assert.match(sanitizePluginCss("html{transform:skewX(4deg)}"), /skewX/);
    assert.equal(/rotate\s*:/i.test(sanitizePluginCss("html{rotate:x 90deg;color:red}")), false);
    assert.match(sanitizePluginCss("html{rotate:x 90deg;color:red}"), /red/);
    assert.match(sanitizePluginCss("html{rotate:90deg}"), /rotate/);
    assert.match(sanitizePluginCss("html{rotate:z 90deg}"), /rotate/);
    assert.equal(/rotateY|backface/i.test(sanitizePluginCss("html{backface-visibility:hidden;transform:rotateY(180deg);color:red}")), false);
    assert.match(sanitizePluginCss("html{backface-visibility:hidden;transform:rotateY(180deg);color:red}"), /red/);
    assert.match(sanitizePluginCss("html{backface-visibility:hidden}"), /backface/);
    assert.match(sanitizePluginCss("html{transform:rotateY(180deg)}"), /rotateY/);
    assert.match(sanitizePluginCss("html{backface-visibility:hidden;transform:rotateZ(180deg)}"), /rotateZ/);
    assert.match(sanitizePluginCss("html{backface-visibility:hidden;transform:scale(-1)}"), /scale/);
    assert.equal(/left\s*:/i.test(sanitizePluginCss("html{position:relative;left:-100%;color:red}")), false);
    assert.match(sanitizePluginCss("html{position:relative;left:-100%;color:red}"), /red/);
    assert.match(sanitizePluginCss("html{position:relative;left:4px}"), /4px/);
    assert.equal(/margin/i.test(sanitizePluginCss("body{margin-left:-100vw}")), false);
    assert.match(sanitizePluginCss("html{margin-left:16px}"), /16px/);
    assert.equal(/inset/i.test(sanitizePluginCss("html{inset:-100% 0 0 0}")), false);
    assert.equal(/translateX/i.test(sanitizePluginCss("html{transform:translateX(-9999px)}")), false);
    assert.match(sanitizePluginCss("html{transform:translateX(4px)}"), /translateX/);
    assert.match(sanitizePluginCss(".note{left:-100%}"), /left/);
    assert.equal(/contain/i.test(sanitizePluginCss("html{contain:strict;color:red}")), false);
    assert.match(sanitizePluginCss("html{contain:strict;color:red}"), /red/);
    assert.equal(/contain/i.test(sanitizePluginCss("html{contain:size paint}")), false);
    assert.match(sanitizePluginCss("html{contain:size}"), /contain/);
    assert.match(sanitizePluginCss("html{contain:paint}"), /contain/);
    assert.match(sanitizePluginCss(".note{contain:strict}"), /strict/);
    assert.equal(/offset-path/i.test(sanitizePluginCss("html{offset-path:path('M -2000 0');color:red}")), false);
    assert.match(sanitizePluginCss("html{offset-path:path('M -2000 0');color:red}"), /red/);
    assert.match(sanitizePluginCss("html{offset-path:none}"), /none/);
    assert.match(sanitizePluginCss(".note{offset-path:path('M -2000 0')}"), /offset-path/);
    assert.equal(/blur/i.test(sanitizePluginCss("html{filter:blur(12px);color:red}")), false);
    assert.match(sanitizePluginCss("html{filter:blur(12px);color:red}"), /red/);
    assert.match(sanitizePluginCss("html{filter:blur(4px)}"), /blur/);
    assert.match(sanitizePluginCss("html{filter:grayscale(1)}"), /grayscale/);
    assert.equal(/text-indent/i.test(sanitizePluginCss("html{text-indent:-100%;white-space:nowrap;overflow:hidden;color:red}")), false);
    assert.match(sanitizePluginCss("html{text-indent:-100%;white-space:nowrap;overflow:hidden;color:red}"), /nowrap/);
    assert.match(sanitizePluginCss("html{text-indent:-100%;white-space:nowrap;overflow:hidden;color:red}"), /red/);
    assert.match(sanitizePluginCss("html{text-indent:2em}"), /2em/);
    assert.match(sanitizePluginCss(".note{transform:rotateX(90deg)}"), /rotateX/);
    assert.equal(/transform/i.test(sanitizePluginCss("html{--t:rotateX(90deg);transform:var(--t);color:red}")), false);
    assert.match(sanitizePluginCss("html{--t:rotateX(90deg);transform:var(--t);color:red}"), /red/);
    assert.equal(/rotateX/i.test(sanitizePluginCss("html{transform:if(media(width): rotateX(90deg); else: none)}")), false);
    assert.match(sanitizePluginCss("html{transform:if(media(print): rotateX(90deg); else: none)}"), /rotateX/);
    assert.equal(/translateZ/i.test(sanitizePluginCss("html{perspective:1px}body{transform:translateZ(-100px);color:red}")), false);
    assert.match(sanitizePluginCss("html{perspective:1px}body{transform:translateZ(-100px);color:red}"), /perspective/);
    assert.match(sanitizePluginCss("html{perspective:1px}body{transform:translateZ(-100px);color:red}"), /red/);
    assert.match(sanitizePluginCss("body{transform:translateZ(-100px)}"), /translateZ/);
    assert.match(sanitizePluginCss("html{perspective:800px}body{transform:translateZ(-100px)}"), /translateZ/);
    assert.equal(/animation/i.test(sanitizePluginCss("@keyframes h{to{transform:rotateX(90deg)}}html{animation:h 0s forwards;color:red}")), false);
    assert.match(sanitizePluginCss("@keyframes h{to{transform:rotateX(90deg)}}html{animation:h 0s forwards;color:red}"), /red/);
    assert.match(sanitizePluginCss(".desk{position:fixed;top:0}"), /fixed/);
    assert.match(sanitizePluginCss("html{filter:grayscale(1)}"), /grayscale/);
    assert.match(sanitizePluginCss("html{transform:rotate(2deg)}"), /rotate/);
    assert.match(sanitizePluginCss("html{transform:scale(-1)}"), /scale/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-width: 0e0px): 0; else: 1);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(min-width: 0e0px): 0; else: 1);color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-width: 0e+0px): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-width: +0px): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-width: -0px): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(width >= 0e0px): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-width: calc(0px)): 0; else: 1);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(min-width: calc(0px)): 0; else: 1);color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-width: calc(1px - 1px)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-width: calc(0cap)): 0; else: 1)}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(min-width: calc(10px)): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(min-width: 10px): 0; else: 1)}"), /if/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-width: 0px or min-height: 0px): 1; else: 0);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(min-width: 0px or min-height: 0px): 1; else: 0);color:red}"), /red/);
    assert.match(sanitizePluginCss("html{opacity:if(media(min-width: 0px or min-height: 0px): 0; else: 1)}"), /if/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(not (min-width: 0px or min-height: 0px)): 1; else: 0)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(width > 0px or height > 0px): 1; else: 0)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media((min-width: 0px) or (min-height: 0px)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media((min-width: 0px) and (min-height: 0px)): 0; else: 1)}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media((min-width: 0px) or (min-height: 0px)): 0.5; else: 0)}"), /0\.5/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(orientation: portrait, orientation: landscape): 1; else: 0);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(orientation: portrait, orientation: landscape): 0; else: 1)}"), /if/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media((orientation: portrait) or (orientation: landscape)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(resolution: 0dpi): 1; else: 0);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(resolution: 0dpi): 1; else: 0);color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(resolution = 0dppx): 1; else: 0)}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(resolution = 0dppx): 0; else: 1)}"), /if/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(color: 0): 1; else: 0)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(0 = color): 1; else: 0)}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(color: 0): 0; else: 1)}"), /if/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-color: 17): 1; else: 0)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(color > 16): 1; else: 0)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(17 <= color): 1; else: 0)}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(color <= 8): 0; else: 1)}"), /if/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(monochrome: 1): 1; else: 0)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(monochrome = 1): 1; else: 0)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(monochrome >= 1): 1; else: 0)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(1 = monochrome): 1; else: 0)}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(monochrome: 1): 0; else: 1)}"), /if/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(device-aspect-ratio): 0; else: 1);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(device-aspect-ratio): 0; else: 1);color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(device-aspect-ratio > 0/1): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(max-device-aspect-ratio: 0/1): 1; else: 0)}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(max-device-aspect-ratio: 0/1): 0; else: 1)}"), /if/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(-webkit-device-pixel-ratio > 0): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(-webkit-min-device-pixel-ratio: 0): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(0 <= -webkit-device-pixel-ratio): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(-webkit-max-device-pixel-ratio: 0): 1; else: 0)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(-webkit-device-pixel-ratio: 0): 1; else: 0)}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(-webkit-device-pixel-ratio: 1): 0; else: 1)}"), /if/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(scan): 1; else: 0)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(scan: progressive): 1; else: 0)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(not (scan)): 0; else: 1)}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(scan): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(hover): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(pointer): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(update): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(1px <= width): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(prefers-reduced-motion): 0; else: 1)}"), /if/);
    assert.equal(/contain|width/i.test(sanitizePluginCss("html{contain:paint;width:0;color:red}")), false);
    assert.match(sanitizePluginCss("html{contain:paint;width:0;color:red}"), /red/);
    assert.match(sanitizePluginCss("html{contain:paint}"), /paint/);
    assert.match(sanitizePluginCss("html{contain:size}"), /contain/);
    assert.match(sanitizePluginCss("html{width:0}"), /width/);
    assert.equal(/contain|height/i.test(sanitizePluginCss("html{contain:content;height:0;color:red}")), false);
    assert.match(sanitizePluginCss("html{contain:content;height:0;color:red}"), /red/);
    assert.equal(/paint|width/i.test(sanitizePluginCss("html{contain:paint;color:red}html{width:0;color:blue}")), false);
    assert.match(sanitizePluginCss("html{contain:paint;color:red}html{width:0;color:blue}"), /red/);
    assert.match(sanitizePluginCss("html{contain:paint;color:red}html{width:0;color:blue}"), /blue/);
    assert.match(sanitizePluginCss("html{contain:paint;color:red}body{width:0;color:blue}"), /paint/);
    assert.match(sanitizePluginCss("html{contain:paint;color:red}body{width:0;color:blue}"), /width/);
    assert.match(sanitizePluginCss(".note{contain:paint;width:0}"), /paint/);
    assert.equal(/transform/i.test(sanitizePluginCss("html{transform:perspective(1px) translateZ(-100px);color:red}")), false);
    assert.match(sanitizePluginCss("html{transform:perspective(1px) translateZ(-100px);color:red}"), /red/);
    assert.equal(/transform/i.test(sanitizePluginCss("html{transform:perspective(1px) translate3d(0,0,-100px)}")), false);
    assert.match(sanitizePluginCss("html{transform:perspective(800px) translateZ(-100px)}"), /translateZ/);
    assert.match(sanitizePluginCss("html{transform:translateZ(-100px) perspective(1px)}"), /translateZ/);
    assert.match(sanitizePluginCss("html{transform:perspective(1px)}"), /perspective/);
    assert.match(sanitizePluginCss(".note{transform:perspective(1px) translateZ(-100px)}"), /perspective/);
    assert.equal(/translateX/i.test(sanitizePluginCss("html{transform:translateX(-100dvi)}")), false);
    assert.equal(/translateY/i.test(sanitizePluginCss("html{transform:translateY(-100dvb)}")), false);
    assert.equal(/translateY/i.test(sanitizePluginCss("html{transform:translateY(-100lvb)}")), false);
    assert.equal(/translateX/i.test(sanitizePluginCss("html{transform:translateX(-100svi)}")), false);
    assert.equal(/top/i.test(sanitizePluginCss("html{position:relative;top:-100dvb;color:red}")), false);
    assert.match(sanitizePluginCss("html{position:relative;top:-100dvb;color:red}"), /red/);
    assert.match(sanitizePluginCss("html{transform:translateX(-100px)}"), /translateX/);
    assert.match(sanitizePluginCss(".note{transform:translateX(-100dvi)}"), /dvi/);
    assert.equal(/translateX/i.test(sanitizePluginCss("html{transform:translateX(-10000q)}")), false);
    assert.match(sanitizePluginCss("html{transform:translateX(-4000q)}"), /-4000q/);
    assert.equal(/margin/i.test(sanitizePluginCss("html{margin-left:-10000q}")), false);
    assert.match(sanitizePluginCss("html{margin-left:16px}"), /16px/);
    assert.equal(/font-size/i.test(sanitizePluginCss("html{font-size:calc(1cap - 1cap);color:red}")), false);
    assert.match(sanitizePluginCss("html{font-size:calc(1cap - 1cap);color:red}"), /red/);
    assert.equal(/font-size/i.test(sanitizePluginCss("html{font-size:calc(1q - 1q)}")), false);
    assert.equal(/font-size/i.test(sanitizePluginCss("html{font-size:calc(0 * 1q)}")), false);
    assert.match(sanitizePluginCss("html{font-size:1cap}"), /1cap/);
    assert.match(sanitizePluginCss("html{font-size:18px}"), /18px/);
    assert.match(sanitizePluginCss(".note{font-size:calc(1cap - 1cap)}"), /font-size/);
    assert.equal(/text-indent/i.test(sanitizePluginCss("html{text-indent:-9999px;color:red}")), false);
    assert.match(sanitizePluginCss("html{text-indent:-9999px;color:red}"), /red/);
    assert.equal(/text-indent/i.test(sanitizePluginCss("html{text-indent:-1000px}")), false);
    assert.match(sanitizePluginCss("html{text-indent:-400px}"), /-400px/);
    assert.match(sanitizePluginCss("html{text-indent:-100%}"), /-100%/);
    assert.match(sanitizePluginCss("html{text-indent:2em}"), /2em/);
    assert.match(sanitizePluginCss(".note{text-indent:-9999px}"), /text-indent/);
    assert.match(sanitizePluginCss("html{filter:blur(10q)}"), /blur/);
    assert.equal(/blur/i.test(sanitizePluginCss("html{filter:blur(20q);color:red}")), false);
    assert.match(sanitizePluginCss("html{filter:blur(20q);color:red}"), /red/);
    assert.match(sanitizePluginCss("html{filter:blur(4px)}"), /blur/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-width: calc(1cap - 1cap)): 0; else: 1);color:red}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(min-width: calc(1cap - 1cap)): 0; else: 1);color:red}"), /red/);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-width: calc(1q - 1q)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-width: calc(0 * 1q)): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-width: 0rcap): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(min-width: 0ric): 0; else: 1)}")), false);
    assert.equal(/opacity\s*:/i.test(sanitizePluginCss("html{opacity:if(media(not (min-width: calc(1q - 1q))): 1; else: 0)}")), false);
    assert.match(sanitizePluginCss("html{opacity:if(media(min-width: calc(10px)): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(hover): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(color <= 8): 0; else: 1)}"), /if/);
    assert.match(sanitizePluginCss("html{opacity:if(media(device-pixel-ratio > 0): 0; else: 1)}"), /if/);
    assert.equal(/text-fill/i.test(sanitizePluginCss("html{-webkit-text-fill-color:transparent;color:red}")), false);
    assert.match(sanitizePluginCss("html{-webkit-text-fill-color:transparent;color:red}"), /red/);
    assert.equal(/text-fill/i.test(sanitizePluginCss("body{-webkit-text-fill-color:rgba(0,0,0,0)}")), false);
    assert.equal(/text-fill/i.test(sanitizePluginCss("*{-webkit-text-fill-color:transparent;color:red}")), false);
    assert.match(sanitizePluginCss("*{-webkit-text-fill-color:transparent;color:red}"), /red/);
    assert.equal(/text-fill/i.test(sanitizePluginCss("html{-webkit-text-fill-color:rgb(0 0 0 / none)}")), false);
    assert.match(sanitizePluginCss("html{-webkit-text-fill-color:#222}"), /222/);
    assert.match(sanitizePluginCss(".note{-webkit-text-fill-color:transparent}"), /transparent/);
    assert.equal(/letter-spacing/i.test(sanitizePluginCss("html{letter-spacing:-12px;color:red}")), false);
    assert.match(sanitizePluginCss("html{letter-spacing:-12px;color:red}"), /red/);
    assert.match(sanitizePluginCss("html{letter-spacing:-8px}"), /-8px/);
    assert.match(sanitizePluginCss("html{letter-spacing:2px}"), /2px/);
    assert.match(sanitizePluginCss("html{letter-spacing:0.04em}"), /0\.04em/);
    assert.equal(/letter-spacing/i.test(sanitizePluginCss("html{letter-spacing:-100vw}")), false);
    assert.match(sanitizePluginCss(".note{letter-spacing:-9999px}"), /letter-spacing/);
    assert.equal(/word-spacing/i.test(sanitizePluginCss("html{word-spacing:-96px}")), false);
    assert.match(sanitizePluginCss("html{word-spacing:-48px}"), /-48px/);
    assert.match(sanitizePluginCss("html{word-spacing:0.2em}"), /0\.2em/);
    assert.equal(/padding/i.test(sanitizePluginCss("html{padding-left:100vw;color:red}")), false);
    assert.match(sanitizePluginCss("html{padding-left:100vw;color:red}"), /red/);
    assert.match(sanitizePluginCss("html{padding-left:16px}"), /16px/);
    assert.match(sanitizePluginCss("html{padding-left:400px}"), /400px/);
    assert.equal(/padding/i.test(sanitizePluginCss("html{padding-top:100vh}")), false);
    assert.equal(/padding/i.test(sanitizePluginCss("body{padding-left:100%}")), false);
    assert.match(sanitizePluginCss(".note{padding-left:100vw}"), /padding/);
    assert.equal(/mask/i.test(sanitizePluginCss("html{mask-image:linear-gradient(#000,#000);mask-size:0;color:red}")), false);
    assert.match(sanitizePluginCss("html{mask-image:linear-gradient(#000,#000);mask-size:0;color:red}"), /red/);
    assert.match(sanitizePluginCss("html{mask-size:0}"), /mask-size/);
    assert.match(sanitizePluginCss("html{mask-image:linear-gradient(#000,#000)}"), /mask-image/);
    assert.equal(/mask/i.test(sanitizePluginCss("html{mask-image:linear-gradient(#000,#000);color:red}html{mask-size:0;color:blue}")), false);
    assert.match(sanitizePluginCss("html{mask-image:linear-gradient(#000,#000);color:red}html{mask-size:0;color:blue}"), /red/);
    assert.match(sanitizePluginCss("html{mask-image:linear-gradient(#000,#000);color:red}html{mask-size:0;color:blue}"), /blue/);
    assert.match(sanitizePluginCss(".note{mask-image:linear-gradient(#000,#000);mask-size:0}"), /mask/);
    assert.equal(/mask-image/i.test(sanitizePluginCss("html{mask-image:linear-gradient(black,black);mask-repeat:no-repeat;mask-position:-100vw -100vh;mask-size:1px;color:red}")), false);
    assert.match(sanitizePluginCss("html{mask-image:linear-gradient(black,black);mask-repeat:no-repeat;mask-position:-100vw -100vh;mask-size:1px;color:red}"), /red/);
    assert.match(sanitizePluginCss("html{mask-image:linear-gradient(black,black);mask-repeat:no-repeat;mask-position:4px}"), /mask-image/);
    assert.equal(/background/i.test(sanitizePluginCss("html::before{content:'';position:fixed;inset:0;background:#fff;z-index:9}")), false);
    assert.match(sanitizePluginCss("html::before{content:'';position:fixed;inset:0;background:#fff;z-index:9}"), /content/);
    assert.match(sanitizePluginCss("html::before{content:'\"'}"), /content/);
    assert.match(sanitizePluginCss("html::before{content:'';position:fixed;top:8px;left:8px;width:8px;height:8px;background:red}"), /background/);
    assert.match(sanitizePluginCss(".note::before{content:'';position:fixed;inset:0;background:#fff}"), /background/);
    assert.match(sanitizePluginCss("html::before{content:'';position:fixed;inset:0;background:#fff;opacity:0.15}"), /background/);
    assert.equal(/background/i.test(sanitizePluginCss("*::before{content:'';position:fixed;inset:0;background:#fff}")), false);
    assert.equal(/background/i.test(sanitizePluginCss("html:before{content:'';position:fixed;inset:0;background:#fff}")), false);
    assert.equal(/background/i.test(sanitizePluginCss("body *::before{content:'';position:fixed;inset:0;background:#fff}")), false);
    assert.match(sanitizePluginCss("html .note::before{content:'';position:fixed;inset:0;background:#fff}"), /background/);
    assert.match(sanitizePluginCss("html{transform:rotateX(89deg)}"), /89deg/);
    assert.match(sanitizePluginCss("html{transform:rotate(2deg)}"), /rotate/);
    assert.match(sanitizePluginCss("html{transform:scale(0.001)}"), /0\.001/);
    assert.match(sanitizePluginCss("html{zoom:0.001}"), /0\.001/);
    assert.match(sanitizePluginCss("html{font-size:18px}"), /18px/);
    assert.match(sanitizePluginCss("html{transform:scale(-1)}"), /scale/);
    assert.match(sanitizePluginCss("html{font-size:18px}"), /18px/);
    assert.match(sanitizePluginCss("html{transform:scale(-1)}"), /scale/);
    assert.match(sanitizePluginCss(".note{font-size:0}"), /font-size:\s*0/);
    assert.match(sanitizePluginCss(".desk{position:fixed;top:0}"), /fixed/);
  });
});

describe("links", () => {
  const poisoned = ["mailto:a@b.com\nhttps://evil.example", "https://good.example\r\nmailto:a@b.com", "javascript:alert(1)", "file:///C:/Windows/note.txt", "https://good.example javascript:alert(1)"];

  it("opens one web address or one email, on the page and in the shell", () => {
    for (const href of poisoned) {
      assert.equal(isOpenableUrl(href), false, href);
      assert.equal(oneExternalUrl(href), null, href);
    }
    assert.equal(isHttpUrl("https://example.com/a"), true);
    assert.equal(isOpenableUrl("mailto:a@b.com?subject=Hi"), true);
    assert.equal(oneExternalUrl("mailto:a@b.com?subject=Hi"), "mailto:a@b.com?subject=Hi");
    assert.equal(isOpenableUrl("javascript:alert(1)"), false);
    assert.equal(isStoredLink("#note"), true);
    assert.equal(isOpenableUrl("#note"), false);
    assert.equal(isStoredLink("#javascript:alert(1)"), false);
    assert.equal(isOpenableUrl("https://example.com"), true);
    assert.equal(isOpenableUrl("https://example.com@evil.test"), false);
    assert.equal(oneExternalUrl("https://example.com@evil.test"), null);
    assert.equal(isOpenableUrl("mailto:a@b.com?subject=Hi%0aBcc:x@y"), false);
    assert.equal(oneExternalUrl("mailto:a@b.com?subject=Hi%0aBcc:x@y"), null);
    assert.equal(oneExternalUrl("https://example.com/a"), "https://example.com/a");
    assert.equal(oneExternalUrl("https://example.com\\@evil.test"), "https://example.com/@evil.test");
    assert.equal(oneExternalUrl("https://example.com\\evil.test"), "https://example.com/evil.test");
    assert.equal(oneExternalUrl("mailto:a@b.com?subject=Hi%09Bcc:x@y"), null);
    assert.equal(oneExternalUrl("mailto:a@b.com?subject=Hi%E2%80%A8Bcc:x@y"), null);
    assert.equal(isOpenableUrl("mailto:a@b.com?subject=Hi\u2028Bcc:x@y"), false);
    assert.equal(presentationalUrl("background", "https://evil.test/a.png"), null);
    assert.equal(presentationalUrl("background", "data:image/png;base64,aaaa"), "data:image/png;base64,aaaa");
    assert.equal(presentationalUrl("ping", "https://evil.test/ping"), null);
    assert.equal(presentationalUrl("href", "https://example.com"), undefined);
    assert.equal(sameDeskOrigin("http://127.0.0.1:1/", "http://127.0.0.1:8080/"), false);
    assert.equal(sameDeskOrigin("http://127.0.0.1:8080/page", "http://127.0.0.1:8080/"), true);
    assert.equal(sameDeskOrigin("https://example.com/", "http://127.0.0.1:8080/"), false);
    assert.equal(shellSameDesk("http://localhost:8080/", "http://127.0.0.1:8080/"), false);
    assert.equal(shellSameDesk("http://127.0.0.1:8080/a", "http://127.0.0.1:8080/"), true);
  });
});

describe("desk counts", () => {
  it("leaves a blank sheet where a backup page was not text, and ignores trash in a folder size", () => {
    assert.deepEqual(coercePages(["one", null, "three"], "fallback"), ["one", "", "three"]);
    assert.deepEqual(coercePages([], "fallback"), ["fallback"]);
    const folder = {
      id: "f",
      name: "Pages",
      hue: "forest" as const,
      parentId: null,
      color: null,
      createdAt: 10,
      deletedAt: null,
    };
    const child = { ...folder, id: "c", name: "Old", parentId: "f", deletedAt: 20 };
    const live = {
      id: "n1",
      notebookId: "f",
      title: "Live",
      content: "abcd",
      pages: ["abcd"],
      pinned: false,
      color: null,
      createdAt: 10,
      updatedAt: 50,
      deletedAt: null,
    };
    const trashed = { ...live, id: "n2", title: "Trash", content: "zzzzzzzz", pages: ["zzzzzzzz"], updatedAt: 90, deletedAt: 80 };
    const buried = { ...live, id: "n3", notebookId: "c", title: "Buried", content: "qqqqqqqq", pages: ["qqqqqqqq"], updatedAt: 70 };
    assert.equal(folderBytes([folder, child], [live, trashed, buried], "f"), "Live".length + "abcd".length);
    assert.equal(folderUpdated([folder, child], [live, trashed, buried], "f"), 50);
    assert.equal(plainText("See &lt; and <"), "See < and <");
    assert.equal(plainText("Say &#60; and &#x27; and &amp;lt;"), "Say < and ' and &lt;");
    assert.equal(decodeTextEntities("&#128512;"), "\u{1F600}");
    assert.equal(decodeTextEntities("&#55296;"), "");
    assert.equal(decodeTextEntities("&#38;amp;"), "&amp;");
    assert.equal(plainText("hello&#160;world"), "hello world");
    assert.equal(plainText("hello&nbsp;world"), "hello world");
    assert.equal(plainText("a&#8239;b&#8194;c&#12288;d"), "a b c d");
    assert.equal(plainText("a&emsp;b&ensp;c&thinsp;d"), "a b c d");
    assert.equal(plainText("a&emsp13;b&numsp;c&hairsp;d"), "a b c d");
    assert.equal(plainText("a&Tab;b&NewLine;c"), "a b c");
    assert.equal(plainText("well&shy;known"), "well\u00adknown");
    assert.equal(plainText("a&mdash;b"), "a\u2014b");
    assert.equal(plainText("a" + String.fromCharCode(38) + "amp;emsp;b"), "a" + String.fromCharCode(38) + "emsp;b");
    assert.equal(plainText("a&MediumSpace;b&ThinSpace;c&VeryThinSpace;d&NonBreakingSpace;e"), "a b c d e");
    assert.equal(plainText("a&ThickSpace;b"), "a b");
    assert.equal(plainText("a&dash;b&horbar;c&minus;d"), "a\u2010b\u2015c\u2212d");
    assert.equal(plainText("a" + String.fromCharCode(38) + "amp;MediumSpace;b"), "a" + String.fromCharCode(38) + "MediumSpace;b");
    assert.equal(plainText("a&hyphen;b"), "a\u2010b");
    assert.equal(plainText("a" + String.fromCharCode(38) + "amp;hyphen;b"), "a" + String.fromCharCode(38) + "hyphen;b");
    assert.equal(plainText("caf&eacute;"), "caf\u00e9");
    assert.equal(plainText("a&ZeroWidthSpace;b"), "a\u200bb");
    assert.equal(plainText("a&nnbsp;b"), "a b");
    assert.equal(plainText("a" + String.fromCharCode(38) + "amp;nnbsp;b"), "a" + String.fromCharCode(38) + "nnbsp;b");
    assert.equal(plainText("Say " + String.fromCharCode(38) + "lt; and " + String.fromCharCode(38) + "gt;"), "Say < and >");
    assert.equal(foldDeskText("I"), "i");
    assert.notEqual(foldDeskText("I"), "I".toLocaleLowerCase("tr"));
  });
});

describe("lookup", () => {
  it("does not throw when a definition names a lone surrogate", async () => {
    const previous = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("wiktionary")) {
        return {
          ok: true,
          json: async () => ({
            en: [{ partOfSpeech: "Noun", definitions: [{ definition: "A &#55296; mark and &#x1F600; face" }] }],
          }),
        } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    }) as typeof fetch;
    try {
      const sense = await lookupWord("quire");
      assert.match(sense?.definition ?? "", /mark/);
      assert.match(sense?.definition ?? "", /\u{1F600}/u);
    } finally {
      globalThis.fetch = previous;
    }
  });
});

describe("passcode", () => {
  it("matches the whole digest and still waits after a wrong guess", async () => {
    const salt = "abc";
    const hash = await hashPin("1234", salt);
    assert.equal(await pinMatches("1234", salt, hash), true);
    assert.equal(await pinMatches("1235", salt, hash), false);
    assert.equal(await pinMatches("1234", salt, hash.slice(0, 10)), false);
    assert.equal(hash.startsWith(hash.slice(0, 8)), true);
    recordLockFailure("note", "audit-pin");
    assert.ok(lockWaitMs("note", "audit-pin") > 0);
    clearLockFailures("note", "audit-pin");
    assert.equal(lockWaitMs("note", "audit-pin"), 0);
  });
});
