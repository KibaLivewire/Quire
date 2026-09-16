export function normalizeWord(value: string) {
  return value.trim().replace(/^[^\p{L}\p{N}']+/gu, "").replace(/[^\p{L}\p{N}']+$/gu, "").toLowerCase();
}

export function inDictionary(list: string[] | undefined, word: string) {
  const needle = normalizeWord(word);
  if (!needle) return false;
  return (list ?? []).some((item) => item.toLowerCase() === needle);
}

export function addToDictionary(list: string[] | undefined, word: string) {
  const next = normalizeWord(word);
  if (!next) return list ?? [];
  if (inDictionary(list, next)) return list ?? [];
  return [...(list ?? []), next].sort((a, b) => a.localeCompare(b));
}
