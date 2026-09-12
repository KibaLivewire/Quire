import { lookupWord, type WordSense } from "@/lib/word-tools";

function List({ title, items, onPick }: { title: string; items: string[]; onPick?: (word: string) => void }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-[10px] font-medium tracking-wide text-ink-subtle uppercase">{title}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            className="rounded-full bg-paper-inset px-2 py-0.5 text-xs text-ink hover:bg-rule"
            onClick={() => onPick?.(item)}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

export function WordLookupCard({
  sense,
  loading,
  onReplace,
}: {
  sense: WordSense | null;
  loading: boolean;
  onReplace?: (word: string) => void;
}) {
  if (loading) {
    return <p className="px-1 py-2 text-sm text-ink-muted">Looking that word up…</p>;
  }
  if (!sense) {
    return (
      <p className="px-1 py-2 text-sm text-ink-muted">
        Select a word on the page, then click Look up word.
      </p>
    );
  }
  return (
    <div className="grid gap-3 px-1 py-1">
      <div>
        <p className="font-display text-xl font-semibold tracking-tight capitalize">{sense.word}</p>
        <p className="mt-0.5 text-sm text-ink-muted">
          {sense.phonetic ? <span className="mr-2">{sense.phonetic}</span> : null}
          {sense.partOfSpeech ? (
            <span className="rounded-full bg-paper-inset px-2 py-0.5 text-[11px] tracking-wide uppercase">
              {sense.partOfSpeech}
            </span>
          ) : null}
        </p>
        {sense.definition ? <p className="mt-2 text-sm leading-relaxed text-ink">{sense.definition}</p> : null}
        {sense.example ? (
          <p className="mt-2 text-sm leading-relaxed text-ink-muted italic">“{sense.example}”</p>
        ) : null}
      </div>
      <List title="Synonyms" items={sense.synonyms} onPick={onReplace} />
      <List title="Antonyms" items={sense.antonyms} onPick={onReplace} />
    </div>
  );
}

export async function fetchSense(word: string): Promise<WordSense | null> {
  try {
    return await lookupWord(word);
  } catch {
    return null;
  }
}
