import { inDictionary } from "./dictionary";

export type GrammarIssue = {
  message: string;
  offset: number;
  length: number;
  replacements: string[];
};

type PlainDoc = {
  content: { size: number };
  nodesBetween: (
    from: number,
    to: number,
    fn: (node: { isText?: boolean; text?: string; isBlock?: boolean; isLeaf?: boolean; isTextblock?: boolean }, pos: number) => void,
  ) => void;
};

/** Map a LanguageTool offset (editor.getText, blocks joined by \\n\\n) back onto the document. */
export function plainRange(doc: PlainDoc, fromPlain: number, toPlain: number, blockSeparator = "\n\n") {
  let textPos = 0;
  let first = true;
  let from = -1;
  let to = -1;
  doc.nodesBetween(0, doc.content.size, (node, pos) => {
    if (node.isBlock && (node.isLeaf || node.isTextblock) && blockSeparator) {
      if (first) first = false;
      else {
        const next = textPos + blockSeparator.length;
        if (from < 0 && fromPlain >= textPos && fromPlain <= next) from = pos + 1;
        if (to < 0 && toPlain >= textPos && toPlain <= next) to = pos + 1;
        textPos = next;
      }
    }
    if (node.isText && node.text) {
      const start = textPos;
      const end = textPos + node.text.length;
      if (from < 0 && fromPlain >= start && fromPlain <= end) from = pos + (fromPlain - start);
      if (to < 0 && toPlain >= start && toPlain <= end) to = pos + (toPlain - start);
      textPos = end;
    }
  });
  return { from, to };
}

export async function checkGrammar(text: string, dictionary?: string[]): Promise<GrammarIssue[]> {
  const clipped = text.slice(0, 20_000);
  if (!clipped.trim()) return [];
  const body = new URLSearchParams({
    text: clipped,
    language: "en-US",
    enabledOnly: "false",
  });
  const response = await fetch("https://api.languagetool.org/v2/check", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error("Grammar service is unavailable.");
  const data = (await response.json()) as {
    matches?: { message?: string; offset?: number; length?: number; replacements?: { value?: string }[] }[];
  };
  return (data.matches ?? [])
    .slice(0, 40)
    .map((item) => ({
      message: String(item.message ?? "Issue"),
      offset: Number(item.offset ?? 0),
      length: Number(item.length ?? 0),
      replacements: (item.replacements ?? []).map((r) => String(r.value ?? "")).filter(Boolean).slice(0, 5),
    }))
    .filter((item) => {
      const word = clipped.slice(item.offset, item.offset + item.length);
      return !inDictionary(dictionary, word);
    });
}
