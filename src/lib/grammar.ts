export type GrammarIssue = {
  message: string;
  offset: number;
  length: number;
  replacements: string[];
};

export async function checkGrammar(text: string): Promise<GrammarIssue[]> {
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
  return (data.matches ?? []).slice(0, 40).map((item) => ({
    message: String(item.message ?? "Issue"),
    offset: Number(item.offset ?? 0),
    length: Number(item.length ?? 0),
    replacements: (item.replacements ?? []).map((r) => String(r.value ?? "")).filter(Boolean).slice(0, 5),
  }));
}
