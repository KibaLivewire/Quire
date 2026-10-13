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
    assert.equal(sanitizeEditStyle("filter:src('https://evil.test/a.png');transform:rotate(90deg)"), "transform:rotate(90deg)");
    const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
    assert.match(css, /html\[data-device="phone"\] \.page-frame,\s*html\[data-device="phone"\] \.page-frame\.is-bare\s*\{[^}]*grid-template-rows:\s*var\(--page-h/);
    assert.match(css, /html\[data-device="phone"\] \.page-frame \.ruler[\s\S]*?display:\s*none/);
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
