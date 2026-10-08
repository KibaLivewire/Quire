import { sanitizeHtml } from "./sanitize-html";

type OpenFind = (replace?: boolean) => void;
let opener: OpenFind | null = null;

export function registerFindBar(handler: OpenFind) {
  opener = handler;
  return () => {
    if (opener === handler) opener = null;
  };
}

export function openFindBar(replace = false) {
  opener?.(replace);
}

type PageJump = (index: number) => void;
let pageJumper: PageJump | null = null;

export function registerPageJump(handler: PageJump) {
  pageJumper = handler;
  return () => {
    if (pageJumper === handler) pageJumper = null;
  };
}

export function requestPageJump(index: number) {
  pageJumper?.(index);
}

export type TextHit = { from: number; to: number };

function foldInto(
  text: string,
  hay: { value: string },
  push: (originalIndex: number) => void,
) {
  for (let i = 0; i < text.length; ) {
    const cp = text.codePointAt(i) ?? 0;
    const ch = String.fromCodePoint(cp);
    const width = ch.length;
    const lower = ch.toLocaleLowerCase("en-US");
    for (let j = 0; j < lower.length; j += 1) {
      hay.value += lower[j];
      push(i);
    }
    i += width;
  }
}

export function findHits(
  doc: {
    content: { size: number };
    nodesBetween: (
      from: number,
      to: number,
      fn: (node: { isText?: boolean; text?: string; isBlock?: boolean; isLeaf?: boolean; isTextblock?: boolean }, pos: number) => void,
    ) => void;
  },
  query: string,
): TextHit[] {
  const needle = query.trim().toLocaleLowerCase("en-US");
  if (!needle) return [];
  const hay = { value: "" };
  const map: number[] = [];
  let firstBlock = true;
  doc.nodesBetween(0, doc.content.size, (node, pos) => {
    if (node.isBlock && (node.isLeaf || node.isTextblock)) {
      if (firstBlock) firstBlock = false;
      else {
        hay.value += "\n";
        map.push(-1);
      }
    }
    if (!node.isText || !node.text) return;
    foldInto(node.text, hay, (offset) => {
      map.push(pos + offset);
    });
  });
  const hits: TextHit[] = [];
  let start = 0;
  while (start <= hay.value.length - needle.length) {
    const at = hay.value.indexOf(needle, start);
    if (at < 0) break;
    const from = map[at];
    const endIndex = map[at + needle.length - 1];
    if (from == null || from < 0 || endIndex == null || endIndex < 0) {
      start = at + 1;
      continue;
    }
    hits.push({ from, to: endIndex + 1 });
    start = at + 1;
  }
  return hits;
}

type CharRef = { node: Text; offset: number } | null;

function indexHtml(html: string): { root: HTMLElement; hay: string; refs: CharRef[] } | null {
  if (typeof document === "undefined") return null;
  const parsed = new DOMParser().parseFromString(`<div>${sanitizeHtml(html)}</div>`, "text/html");
  const root = parsed.body.firstElementChild as HTMLElement | null;
  if (!root) return null;
  const refs: CharRef[] = [];
  const hay = { value: "" };
  let firstBlock = true;
  const blocks = /^(P|DIV|H1|H2|H3|H4|LI|BLOCKQUOTE|PRE|TR|SECTION|UL|OL|TABLE)$/;

  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      foldInto(text, hay, (offset) => {
        refs.push({ node: node as Text, offset });
      });
      return;
    }
    if (!(node instanceof HTMLElement)) {
      node.childNodes.forEach(walk);
      return;
    }
    if (node.tagName === "SCRIPT" || node.tagName === "STYLE") return;
    if (node.tagName === "BR") {
      hay.value += "\n";
      refs.push(null);
      return;
    }
    if (blocks.test(node.tagName)) {
      if (firstBlock) firstBlock = false;
      else if (!hay.value.endsWith("\n")) {
        hay.value += "\n";
        refs.push(null);
      }
    }
    node.childNodes.forEach(walk);
  }

  root.childNodes.forEach(walk);
  return { root, hay: hay.value, refs };
}

function hitSpans(hay: string, query: string): { from: number; to: number }[] {
  const needle = query.trim().toLocaleLowerCase("en-US");
  if (!needle) return [];
  const spans: { from: number; to: number }[] = [];
  let start = 0;
  while (start <= hay.length - needle.length) {
    const at = hay.indexOf(needle, start);
    if (at < 0) break;
    spans.push({ from: at, to: at + needle.length });
    start = at + Math.max(1, needle.length);
  }
  return spans;
}

export function countHtmlHits(html: string, query: string): number {
  const indexed = indexHtml(html);
  if (!indexed) return 0;
  return hitSpans(indexed.hay, query).length;
}

function applySpan(refs: CharRef[], from: number, to: number, replacement: string) {
  const slice = refs.slice(from, to);
  let first = -1;
  let last = -1;
  for (let i = 0; i < slice.length; i += 1) {
    if (!slice[i]) continue;
    if (first < 0) first = i;
    last = i;
  }
  if (first < 0 || last < 0) return;
  const start = slice[first];
  const end = slice[last];
  if (!start || !end) return;
  if (start.node === end.node) {
    const text = start.node.textContent || "";
    start.node.textContent = text.slice(0, start.offset) + replacement + text.slice(end.offset + 1);
    return;
  }
  const head = start.node.textContent || "";
  const tail = end.node.textContent || "";
  start.node.textContent = head.slice(0, start.offset) + replacement;
  end.node.textContent = tail.slice(end.offset + 1);
  const cleared = new Set<Text>();
  for (let i = first + 1; i < last; i += 1) {
    const ref = slice[i];
    if (!ref || ref.node === start.node || ref.node === end.node || cleared.has(ref.node)) continue;
    cleared.add(ref.node);
    ref.node.textContent = "";
  }
}

export function replaceHtmlHits(html: string, query: string, replacement: string): string {
  const indexed = indexHtml(html);
  if (!indexed) return html;
  const spans = hitSpans(indexed.hay, query);
  for (let i = spans.length - 1; i >= 0; i -= 1) {
    const span = spans[i];
    applySpan(indexed.refs, span.from, span.to, replacement);
  }
  return indexed.root.innerHTML;
}
