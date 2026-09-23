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

export type TextHit = { from: number; to: number };

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
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  let hay = "";
  const map: number[] = [];
  let firstBlock = true;
  doc.nodesBetween(0, doc.content.size, (node, pos) => {
    if (node.isBlock && (node.isLeaf || node.isTextblock)) {
      if (firstBlock) firstBlock = false;
      else {
        hay += "\n";
        map.push(-1);
      }
    }
    if (!node.isText || !node.text) return;
    const text = node.text.toLowerCase();
    for (let i = 0; i < text.length; i += 1) {
      hay += text[i];
      map.push(pos + i);
    }
  });
  const hits: TextHit[] = [];
  let start = 0;
  while (start <= hay.length - needle.length) {
    const at = hay.indexOf(needle, start);
    if (at < 0) break;
    const from = map[at];
    const end = map[at + needle.length - 1];
    if (from == null || from < 0 || end == null || end < 0) {
      start = at + 1;
      continue;
    }
    hits.push({ from, to: end + 1 });
    start = at + Math.max(1, needle.length);
  }
  return hits;
}
