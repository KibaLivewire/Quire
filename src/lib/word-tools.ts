export type WordSense = {
  word: string;
  definition: string;
  synonyms: string[];
  antonyms: string[];
  similar: string[];
  phrases: string[];
};

function takeWords(rows: unknown, max = 10): string[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => (row && typeof row === "object" && "word" in row ? String((row as { word: string }).word) : ""))
    .filter(Boolean)
    .slice(0, max);
}

async function datamuse(params: string): Promise<unknown> {
  const res = await fetch(`https://api.datamuse.com/words?${params}`);
  if (!res.ok) return [];
  return res.json();
}

export function selectedPlainWord(text: string): string {
  return text.replace(/[^\p{L}\p{N}'’-]+/gu, " ").trim().split(/\s+/)[0] ?? "";
}

export async function lookupWord(raw: string): Promise<WordSense | null> {
  const word = selectedPlainWord(raw).toLowerCase();
  if (!word) return null;

  const [syn, ant, similar, phrases, defRes] = await Promise.all([
    datamuse(`rel_syn=${encodeURIComponent(word)}&max=12`),
    datamuse(`rel_ant=${encodeURIComponent(word)}&max=8`),
    datamuse(`ml=${encodeURIComponent(word)}&max=12`),
    datamuse(`rel_jja=${encodeURIComponent(word)}&max=8`),
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
  ]);

  let definition = "";
  try {
    const meaning = defRes?.[0]?.meanings?.[0];
    const def = meaning?.definitions?.[0]?.definition;
    if (typeof def === "string") definition = def;
  } catch {
    definition = "";
  }

  return {
    word,
    definition,
    synonyms: takeWords(syn),
    antonyms: takeWords(ant),
    similar: takeWords(similar).filter((item) => item.toLowerCase() !== word),
    phrases: takeWords(phrases, 6),
  };
}

export function webSearchUrl(query: string): string {
  return `https://duckduckgo.com/?q=${encodeURIComponent(query.trim())}`;
}
