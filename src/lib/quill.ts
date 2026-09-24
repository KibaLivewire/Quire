import { checkGrammar } from "./grammar";
import { lookupWord } from "./word-tools";

export type QuillMessage = {
  id: string;
  from: "quill" | "you";
  text: string;
  replacement?: string;
};

const FILLER = /\b(just|really|very|actually|basically|literally|quite|perhaps|maybe)\b/gi;

type Voice = {
  person: "i" | "you" | "they" | "mixed";
  formal: boolean;
  avgWords: number;
  contractions: boolean;
};

export function greetingForNow() {
  const hour = new Date().getHours();
  const when = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return `${when}. I'm Quill. Highlight a passage and I can shorten it, flesh it out in your voice, polish the grammar, or sit with a word's sense. The notebook stays on this device. A definition or a polish sends only that sentence out.`;
}

function analyzeVoice(text: string): Voice {
  const words = text.split(/\s+/).filter(Boolean);
  const lower = text.toLowerCase();
  const iCount = (lower.match(/\b(i|i'm|i've|my|me)\b/g) || []).length;
  const youCount = (lower.match(/\b(you|your|you're)\b/g) || []).length;
  const theyCount = (lower.match(/\b(he|she|they|them|his|her)\b/g) || []).length;
  let person: Voice["person"] = "mixed";
  if (iCount >= youCount && iCount >= theyCount && iCount > 0) person = "i";
  else if (youCount > iCount && youCount >= theyCount) person = "you";
  else if (theyCount > 0) person = "they";
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgWords = sentences.length ? words.length / sentences.length : words.length;
  const contractions = /n't|'re|'ve|'ll|'m|'d\b/.test(lower);
  const formal = !contractions && /\b(therefore|thus|however|moreover|shall)\b/.test(lower);
  return { person, formal, avgWords, contractions };
}

async function related(word: string) {
  try {
    const res = await fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word)}&max=8`);
    if (!res.ok) return [];
    const data = (await res.json()) as { word?: string }[];
    return data.map((item) => item.word).filter((item): item is string => Boolean(item));
  } catch {
    return [];
  }
}

async function relatedIdeas(word: string) {
  try {
    const res = await fetch(`https://api.datamuse.com/words?ml=${encodeURIComponent(word)}&max=8`);
    if (!res.ok) return [];
    const data = (await res.json()) as { word?: string }[];
    return data.map((item) => item.word).filter((item): item is string => Boolean(item));
  } catch {
    return [];
  }
}

async function define(word: string): Promise<{ text: string } | null> {
  try {
    const sense = await lookupWord(word);
    if (!sense?.definition) return null;
    const pos = sense.partOfSpeech ? ` (${sense.partOfSpeech})` : "";
    const example = sense.example ? ` Example: ${sense.example}` : "";
    return { text: `${sense.word || word}${pos}: ${sense.definition}${example}` };
  } catch {
    return null;
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

function fleshOut(text: string, voice: Voice) {
  const trimmed = text.trim();
  if (!trimmed) return text;
  const parts = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
  const grown = parts.map((sentence) => expandSentence(sentence, voice));
  return grown.join(" ");
}

function expandSentence(sentence: string, voice: Voice) {
  const clean = sentence.trim();
  if (!clean) return clean;
  const end = /[.!?]$/.test(clean) ? "" : ".";
  const body = clean.replace(/[.!?]+$/, "");
  if (body.split(/\s+/).length >= 22) return clean.endsWith(".") || /[.!?]$/.test(clean) ? clean : `${body}.`;
  const extra = voice.formal
    ? "The detail is modest, but it holds the line in place"
    : voice.person === "i"
      ? "I can still see it if I stay with the sentence a moment longer"
      : voice.person === "you"
        ? "You already know the rest of that picture; it is sitting just behind the words"
        : "There is a little more in the room than the first pass named";
  if (voice.contractions && extra.startsWith("There is")) {
    return `${body} — there's a little more in the room than the first pass named${end || "."}`;
  }
  return `${body} — ${extra}${end || "."}`;
}

async function polish(text: string, dictionary?: string[]) {
  try {
    const issues = await checkGrammar(text, dictionary);
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

function perspective(voice: Voice, topic: string) {
  if (voice.person === "i") {
    return `From inside the sentence, “${topic}” is something you are living, not reporting. Keep the body close; let the idea arrive as a feeling first.`;
  }
  if (voice.formal) {
    return `Treat “${topic}” as a claim that must earn its keep. What would a careful reader still need in order to believe it?`;
  }
  return `“${topic}” wants a second look: what is it next to, what does it cost, and who is in the room when it happens?`;
}

function asks(lower: string, pattern: RegExp) {
  return pattern.test(lower);
}

export async function askQuill(prompt: string, selection: string, dictionary?: string[]): Promise<{ reply: string; replacement?: string }> {
  const ask = prompt.trim();
  const lower = ask.toLowerCase();
  const source = selection.trim();
  const voice = analyzeVoice(source || ask);

  if (!ask && !source) {
    return { reply: "Highlight a line on the page, or tell me: shorter, clearer, flesh it out, polish, or the sense of a word." };
  }

  if (asks(lower, /\b(help|hello|hi)\b|what can you|who are you/) && !source) {
    return { reply: greetingForNow() };
  }

  if (!source && asks(lower, /\b(shorter|shorten|clearer|polish|fleshed|flesh|expand|continue)\b/)) {
    return { reply: "Select the sentence on the page first, then ask me again." };
  }

  if (source && asks(lower, /\b(shorter|shorten|tighten|tighter)\b/)) {
    const replacement = shorten(source);
    return { reply: replacement === source ? "That line is already lean." : "A tighter cut, still in your register.", replacement };
  }

  if (source && asks(lower, /\b(clearer|clarify|plain|simpler)\b/)) {
    return { reply: "A cleaner pass:", replacement: clearer(source) };
  }

  if (source && asks(lower, /\b(flesh|fleshed|lengthen|longer|expand)\b|more room/)) {
    return {
      reply: "I kept your person and pace, and gave the line a little more air.",
      replacement: fleshOut(source, voice),
    };
  }

  if (source && (asks(lower, /\b(polish|grammar|correct)\b/) || lower === "fix")) {
    const replacement = await polish(source, dictionary);
    return { reply: replacement === source ? "I wouldn't change the grammar here." : "Polished, with the original sense kept.", replacement };
  }

  if (asks(lower, /\b(synonym|thesaurus)\b|better word|another word/)) {
    const word = (source || ask).split(/\s+/).pop() || "";
    const clean = word.replace(/[^a-zA-Z'-]/g, "");
    const words = await related(clean);
    const ideas = await relatedIdeas(clean);
    if (!words.length && !ideas.length) return { reply: `I don't have a better word for “${word}” just now.` };
    const syn = words.length ? `Close words: ${words.join(", ")}.` : "";
    const near = ideas.length ? ` Nearby ideas: ${ideas.slice(0, 5).join(", ")}.` : "";
    return { reply: `${syn}${near}`.trim() };
  }

  if (asks(lower, /\b(define|definition)\b|sense of|what is|look up|\bmean\b|\bmeans\b/)) {
    const word = (source || ask).split(/\s+/).filter((w) => !/^(mean|means|define|definition|sense|what|is|look|up|of|a|the)$/i.test(w)).pop() || source;
    const clean = word.replace(/[^a-zA-Z'-]/g, "");
    const entry = await define(clean);
    const ideas = await relatedIdeas(clean);
    const extra = ideas.length ? ` Kindred words: ${ideas.slice(0, 4).join(", ")}.` : "";
    if (entry) return { reply: `${entry.text}${extra}\n\n${perspective(voice, clean)}` };
    return { reply: extra || `I couldn't fetch a definition for “${clean}”.` };
  }

  if (source && asks(lower, /\b(continue)\b|next sentence|keep going/)) {
    const stem = source.trim().replace(/[.?!]+$/, "");
    const next = fleshOut(`${stem}.`, voice).replace(stem, "").trim();
    return { reply: "A possible next sentence, in the same voice:", replacement: next || `${stem}. The next line can wait until it is ready.` };
  }

  if (source && asks(lower, /\b(perspective)\b|why\b|how should/)) {
    const topic = source.split(/\s+/).slice(0, 6).join(" ");
    return { reply: perspective(voice, topic) };
  }

  if (source) {
    return {
      reply: "I can shorten that, make it clearer, flesh it out, or polish it. Ask for one of those, or the sense of a word.",
    };
  }

  return { reply: "I can shorten, clarify, flesh out, polish, look up a word, or offer a second perspective. Highlight text and ask." };
}
