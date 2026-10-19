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
    const objectGroup = new File(["{\\rtf1 hello{\\object\\objattph}world}"], "obj-group.rtf");
    const objectOpen = await importDocument(objectGroup);
    assert.equal(objectOpen.html.includes("helloworld"), false);
    assert.match(objectOpen.html, /hello world/);
    const pictGroup = new File(["{\\rtf1 hello{\\pict\\bin0 }world}"], "pict-group.rtf");
    const pictOpen = await importDocument(pictGroup);
    assert.equal(pictOpen.html.includes("helloworld"), false);
    assert.match(pictOpen.html, /hello world/);
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
    assert.match(sanitizePluginCss("html{transform:rotateY(90deg)}"), /rotateY/);
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
    assert.match(sanitizePluginCss("html{opacity:sign(-1);color:#112233}"), /sign\(-1\)/);
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
