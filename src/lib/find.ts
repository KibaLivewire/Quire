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

export function findHits(doc: { descendants: (fn: (node: { isText?: boolean; text?: string }, pos: number) => void) => void }, query: string): TextHit[] {
  const needle = query.trim();
  if (!needle) return [];
  const q = needle.toLowerCase();
  const hits: TextHit[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const hay = node.text.toLowerCase();
    let start = 0;
    while (start <= hay.length - q.length) {
      const at = hay.indexOf(q, start);
      if (at < 0) break;
      hits.push({ from: pos + at, to: pos + at + needle.length });
      start = at + Math.max(1, needle.length);
    }
  });
  return hits;
}
