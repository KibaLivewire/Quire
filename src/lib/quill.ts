import { checkGrammar } from "./grammar";

export type QuillMessage = {
  id: string;
  from: "quill" | "you";
  text: string;
  replacement?: string;
};

const FILLER = /\b(just|really|very|actually|basically|literally|quite|perhaps|maybe)\b/gi;

export function greetingForNow() {
  const hour = new Date().getHours();
  const when = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return `${when}. I'm Quill — I sit at this desk with you. Highlight a sentence and ask me to shorten it, polish it, or find a better word. Your pages stay on this computer.`;
}

async function related(word: string) {
  try {
    const res = await fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word)}&max=6`);
    if (!res.ok) return [];
    const data = (await res.json()) as { word?: string }[];
    return data.map((item) => item.word).filter((item): item is string => Boolean(item));
  } catch {
    return [];
  }
}

function shorten(text: string) {
  return text
    .replace(FILLER, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function clearer(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/,\s+and\s+/g, ". ")
    .replace(/([.!?])\s*/g, "$1 ")
    .trim();
}

function lengthen(text: string) {
  const trimmed = text.trim().replace(/[.]+$/, "");
  if (!trimmed) return text;
  return `${trimmed}. Sit with that a moment — the next line will come if you let the last one breathe.`;
}

async function polish(text: string) {
  try {
    const issues = await checkGrammar(text);
    let next = text;
    for (const issue of [...issues].sort((a, b) => b.offset - a.offset)) {
      const swap = issue.replacements[0];
      if (!swap) continue;
      next = next.slice(0, issue.offset) + swap + next.slice(issue.offset + issue.length);
    }
    return next;
  } catch {
    return text;
  }
}

export async function askQuill(prompt: string, selection: string): Promise<{ reply: string; replacement?: string }> {
  const ask = prompt.trim();
  const lower = ask.toLowerCase();
  const source = selection.trim();

  if (!ask && !source) {
    return { reply: "Highlight a line on the page, or tell me what you need — shorter, clearer, polish, or a better word." };
  }

  if (/help|what can you|who are you|hello|hi\b/.test(lower) && !source) {
    return { reply: greetingForNow() };
  }

  if (/synonym|better word|another word|thesaurus/.test(lower)) {
    const word = (source || ask).split(/\s+/).pop() || "";
    const words = await related(word.replace(/[^a-zA-Z'-]/g, ""));
    if (!words.length) return { reply: `I don't have a better word for “${word}” just now.` };
    return { reply: `Try: ${words.join(", ")}.` };
  }

  if (!source && /short|clear|polish|longer|continue|expand/.test(lower)) {
    return { reply: "Select the sentence on the page first, then ask me again." };
  }

  if (source && (/short|tight|cut/.test(lower) || lower === "shorter")) {
    const replacement = shorten(source);
    return { reply: replacement === source ? "That line is already lean." : "Here's a tighter cut.", replacement };
  }

  if (source && (/clear|plain|simple/.test(lower) || lower === "clearer")) {
    return { reply: "A cleaner pass:", replacement: clearer(source) };
  }

  if (source && (/long|expand|more/.test(lower) || lower === "longer")) {
    return { reply: "A little more room:", replacement: lengthen(source) };
  }

  if (source && (/polish|grammar|fix|correct/.test(lower) || lower === "polish")) {
    const replacement = await polish(source);
    return { reply: replacement === source ? "I wouldn't change the grammar here." : "Polished, with the original sense kept.", replacement };
  }

  if (source && /continue|next sentence|keep going/.test(lower)) {
    const stem = source.trim().replace(/[.?!]+$/, "");
    return { reply: "A possible next sentence:", replacement: `${stem}. Let the next line wait until it is ready.` };
  }

  if (source) {
    const replacement = await polish(shorten(source));
    return { reply: "I worked the selected line. Use Insert to put it on the page.", replacement };
  }

  return { reply: "I can shorten, clarify, polish, or fetch a synonym. Highlight text on the page and ask." };
}
