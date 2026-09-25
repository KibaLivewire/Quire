import { inDictionary } from "./dictionary";

export type GrammarIssue = {
  message: string;
  offset: number;
  length: number;
  replacements: string[];
};

type PlainNode = {
  isText?: boolean;
  text?: string;
  isBlock?: boolean;
  isLeaf?: boolean;
  isTextblock?: boolean;
  type?: { name?: string };
};

type PlainDoc = {
  content: { size: number };
  nodesBetween: (
    from: number,
    to: number,
    fn: (node: PlainNode, pos: number) => boolean | void,
  ) => void;
};

function isHardBreak(node: PlainNode) {
  return node.type?.name === "hardBreak";
}

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
    if (isHardBreak(node)) {
      const start = textPos;
      const end = textPos + 1;
      if (from < 0 && fromPlain >= start && fromPlain <= end) from = pos + (fromPlain - start);
      if (to < 0 && toPlain >= start && toPlain <= end) to = pos + (toPlain - start);
      textPos = end;
    }
  });
  return { from, to };
}

/** Where a document position sits in editor.getText(), which joins blocks with \\n\\n. */
export function plainOffset(doc: PlainDoc, target: number, blockSeparator = "\n\n") {
  let textPos = 0;
  let first = true;
  let found = -1;
  doc.nodesBetween(0, doc.content.size, (node, pos) => {
    if (found >= 0) return false;
    if (node.isBlock && (node.isLeaf || node.isTextblock) && blockSeparator) {
      if (first) first = false;
      else textPos += blockSeparator.length;
    }
    if (node.isText && node.text) {
      if (target <= pos) {
        found = textPos;
        return false;
      }
      if (target <= pos + node.text.length) {
        found = textPos + (target - pos);
        return false;
      }
      textPos += node.text.length;
    }
    if (isHardBreak(node)) {
      if (target <= pos) {
        found = textPos;
        return false;
      }
      if (target <= pos + 1) {
        found = textPos + (target - pos);
        return false;
      }
      textPos += 1;
    }
  });
  return found >= 0 ? found : textPos;
}

/** The sentence around a cursor in plain text. Long unbroken text is clipped so a check cannot send the whole sheet. */
export function sentenceAt(text: string, cursor: number) {
  const at = Math.max(0, Math.min(cursor, text.length));
  let start = 0;
  for (let i = at - 1; i >= 0; i -= 1) {
    const ch = text[i];
    if (ch === "\n" || ch === "." || ch === "!" || ch === "?") {
      start = i + 1;
      break;
    }
  }
  let end = text.length;
  for (let i = Math.max(at, start); i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "\n") {
      end = i;
      break;
    }
    if (ch === "." || ch === "!" || ch === "?") {
      end = i + 1;
      break;
    }
  }
  if (end - start > 800) {
    start = Math.max(start, at - 400);
    end = Math.min(end, start + 800);
  }
  while (start < end && text[start] === " ") start += 1;
  while (end > start && /\s/.test(text[end - 1] || "")) end -= 1;
  return { text: text.slice(start, end), start };
}

export async function checkGrammar(text: string, dictionary?: string[]): Promise<GrammarIssue[]> {
  const clipped = text.slice(0, 800);
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
