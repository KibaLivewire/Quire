export type WordSense = {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  synonyms: string[];
  antonyms: string[];
};

const POS: Record<string, string> = {
  n: "Noun",
  v: "Verb",
  adj: "Adjective",
  adv: "Adverb",
  u: "Interjection",
  prop: "Proper noun",
  pron: "Pronoun",
  prep: "Preposition",
  conj: "Conjunction",
  det: "Determiner",
};

const ARPABET: Record<string, string> = {
  AA: "ah",
  AE: "a",
  AH: "uh",
  AO: "aw",
  AW: "ow",
  AY: "igh",
  B: "b",
  CH: "ch",
  D: "d",
  DH: "th",
  EH: "eh",
  ER: "ur",
  EY: "ay",
  F: "f",
  G: "g",
  HH: "h",
  IH: "ih",
  IY: "ee",
  JH: "j",
  K: "k",
  L: "l",
  M: "m",
  N: "n",
  NG: "ng",
  OW: "oh",
  OY: "oy",
  P: "p",
  R: "r",
  S: "s",
  SH: "sh",
  T: "t",
  TH: "th",
  UH: "oo",
  UW: "oo",
  V: "v",
  W: "w",
  Y: "y",
  Z: "z",
  ZH: "zh",
};

function takeWords(rows: unknown, max = 10): string[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => (row && typeof row === "object" && "word" in row ? String((row as { word: string }).word) : ""))
    .filter(Boolean)
    .slice(0, max);
}

function stripMarkup(value: string): string {
  const amp = String.fromCharCode(38);
  const named = (entity: string) => new RegExp(amp + entity + ";", "gi");
  return value
    .replace(/<[^>]+>/g, "")
    .replace(named("nbsp"), " ")
    .replace(named("lt"), "<")
    .replace(named("gt"), ">")
    .replace(named("quot"), '"')
    .replace(named("apos"), "'")
    .replace(new RegExp(amp + "#39;", "gi"), "'")
    .replace(new RegExp(amp + "#x27;", "gi"), "'")
    .replace(new RegExp(amp + "#(\\d+);", "gi"), (all, digits: string) => {
      const code = Number(digits);
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : all;
    })
    .replace(named("amp"), amp)
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJson(url: string, ms = 5000): Promise<unknown> {
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), ms);
  try {
    const res = await fetch(url, { signal: control.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function readablePronunciation(tag: string): string {
  const raw = tag.replace(/^pron:/i, "").trim();
  if (!raw) return "";
  const vowel = /^(AA|AE|AH|AO|AW|AY|EH|ER|EY|IH|IY|OW|OY|UH|UW)$/;
  const phones = raw.split(/\s+/).filter(Boolean).map((part) => {
    const phone = part.replace(/[0-9]/g, "").toUpperCase();
    return {
      sound: ARPABET[phone] ?? phone.toLowerCase(),
      vowel: vowel.test(phone),
    };
  });
  const syllables: string[] = [];
  let i = 0;
  while (i < phones.length) {
    let piece = "";
    while (i < phones.length && !phones[i].vowel) {
      piece += phones[i].sound;
      i += 1;
    }
    if (i < phones.length && phones[i].vowel) {
      piece += phones[i].sound;
      i += 1;
      const start = i;
      const nextVowel = phones.findIndex((item, idx) => idx >= start && item.vowel);
      if (nextVowel === -1) {
        while (i < phones.length) {
          piece += phones[i].sound;
          i += 1;
        }
      } else {
        const coda = Math.max(0, nextVowel - start - 1);
        for (let n = 0; n < coda; n += 1) {
          piece += phones[i].sound;
          i += 1;
        }
      }
    }
    if (piece) syllables.push(piece);
  }
  return syllables.join("-");
}

type WikiSense = {
  partOfSpeech?: string;
  definitions?: { definition?: string; examples?: string[] }[];
};

function fromWiktionary(data: unknown, word: string): Partial<WordSense> {
  if (!data || typeof data !== "object") return {};
  const english = (data as { en?: WikiSense[] }).en;
  if (!Array.isArray(english) || !english.length) return {};
  let partOfSpeech = english[0]?.partOfSpeech || "";
  let definition = "";
  let example = "";
  for (const meaning of english) {
    for (const item of meaning.definitions ?? []) {
      if (!definition && item.definition) {
        definition = item.definition;
        partOfSpeech = meaning.partOfSpeech || partOfSpeech;
      }
      if (!example && item.examples?.[0]) example = item.examples[0];
    }
  }
  return {
    word,
    partOfSpeech,
    definition: stripMarkup(definition),
    example: stripMarkup(example),
  };
}

function fromDatamuseDef(row: unknown, word: string): Partial<WordSense> {
  if (!row || typeof row !== "object") return {};
  const item = row as { tags?: string[]; defs?: string[] };
  const tags = item.tags ?? [];
  const pronTag = tags.find((tag) => tag.startsWith("pron:")) ?? "";
  const posTag = tags.find((tag) => POS[tag]);
  const defLine = item.defs?.[0] || "";
  const [posCode, ...rest] = defLine.split("\t");
  return {
    word,
    phonetic: readablePronunciation(pronTag),
    partOfSpeech: POS[posCode] || (posTag ? POS[posTag] : "") || "",
    definition: rest.join("\t").trim() || defLine.replace(/^[a-z]+\t/, "").trim(),
  };
}

export function selectedPlainWord(text: string): string {
  return text.replace(/[^\p{L}\p{N}'’-]+/gu, " ").trim().split(/\s+/)[0] ?? "";
}

export async function lookupWord(raw: string): Promise<WordSense | null> {
  const word = selectedPlainWord(raw).toLowerCase();
  if (!word) return null;
  const encoded = encodeURIComponent(word);

  const [wiki, muse, syn, ant] = await Promise.all([
    fetchJson(`https://en.wiktionary.org/api/rest_v1/page/definition/${encoded}`),
    fetchJson(`https://api.datamuse.com/words?sp=${encoded}&md=dpr&max=1`),
    fetchJson(`https://api.datamuse.com/words?rel_syn=${encoded}&max=12`),
    fetchJson(`https://api.datamuse.com/words?rel_ant=${encoded}&max=8`),
  ]);

  const wikiSense = fromWiktionary(wiki, word);
  const museRow = Array.isArray(muse) ? muse[0] : null;
  const museSense = fromDatamuseDef(museRow, word);

  const definition = wikiSense.definition || museSense.definition || "";
  if (!definition && !takeWords(syn).length) return null;

  return {
    word,
    phonetic: museSense.phonetic || "",
    partOfSpeech: wikiSense.partOfSpeech || museSense.partOfSpeech || "",
    definition,
    example: wikiSense.example || "",
    synonyms: takeWords(syn).filter((item) => item.toLowerCase() !== word),
    antonyms: takeWords(ant).filter((item) => item.toLowerCase() !== word),
  };
}

export function webSearchUrl(query: string): string {
  return `https://duckduckgo.com/?q=${encodeURIComponent(query.trim())}`;
}
