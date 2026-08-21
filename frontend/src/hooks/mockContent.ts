const DIMENSION_LABELS = ["Accuracy", "Completeness", "Clarity", "Relevance", "Depth"];

const WEAKNESS_BANK = [
  "Skips a concrete example that would make this land",
  "Opens with throat-clearing instead of the answer",
  "Uses jargon without defining it first",
  "Doesn't address the edge cases",
  "Structure is a wall of text — needs breaking up",
  "Misses the 'why' behind the explanation",
];

const SUGGESTION_BANK = [
  "Lead with the core answer, then explain",
  "Add one concrete, relatable example",
  "Break into shorter, labeled sections",
  "Define any technical term on first use",
  "Tie the explanation back to something familiar",
];

function pick<T>(arr: T[], n: number, seed: number): T[] {
  const out: T[] = [];
  const used = new Set<number>();
  let s = seed;
  while (out.length < n && out.length < arr.length) {
    s = (s * 9301 + 49297) % 233280;
    const idx = Math.floor((s / 233280) * arr.length);
    if (!used.has(idx)) {
      used.add(idx);
      out.push(arr[idx]);
    }
  }
  return out;
}

export function mockScores(round: number, seed: number): { label: string; value: number }[] {
  return DIMENSION_LABELS.map((label, i) => {
    const base = 48 + round * 9;
    const jitter = ((seed * (i + 3) * 17) % 21) - 10;
    return { label, value: Math.max(20, Math.min(98, base + jitter)) };
  });
}

export function mockOverallScore(dims: { value: number }[]): number {
  return Math.round(dims.reduce((a, d) => a + d.value, 0) / dims.length);
}

export function mockWeaknesses(round: number): string[] {
  return pick(WEAKNESS_BANK, round === 1 ? 3 : 2, round * 7 + 1);
}

export function mockSuggestions(round: number): string[] {
  return pick(SUGGESTION_BANK, 2, round * 13 + 5);
}

export function mockDraftResponse(prompt: string, round: number): string {
  const topic = prompt.length > 60 ? prompt.slice(0, 60).trim() + "…" : prompt;
  if (round === 1) {
    return `Here's a first pass on "${topic}": the short version is straightforward, but this draft leans on general statements rather than specifics. It covers the basic shape of the answer without much depth or a concrete example to anchor it — a reasonable starting point, but there's clear room to sharpen the explanation and make it land.`;
  }
  return `Revised for round ${round}: this version tightens the explanation of "${topic}", leads with the core point instead of background, and folds in a concrete example to make the idea stick. The structure is cleaner — shorter sections, one idea per beat — and the earlier vague phrasing has been replaced with specifics tied directly to what was asked.`;
}

export function mockCritique(score: number): string {
  if (score >= 85) {
    return "Strong response — hits the rubric across the board. Only minor polish left.";
  }
  if (score >= 65) {
    return "Solid but uneven — some dimensions score well, others need another pass.";
  }
  return "Rough draft energy — the core idea is there but execution needs real work.";
}

export const DEMO_PROMPTS = [
  "Explain quantum entanglement to a 10-year-old using an everyday analogy.",
  "Write a product description for wireless noise-cancelling earbuds.",
  "Debug: why does averaging an empty array return NaN, and how do you fix it?",
];

export const ARENA_MODELS = [
  { id: "m1", name: "llama-3.1-70b", colorVar: "var(--color-hud-green)" },
  { id: "m2", name: "gemini-3.6-flash", colorVar: "var(--color-hud-cyan)" },
  { id: "m3", name: "mixtral-8x7b", colorVar: "var(--color-hud-pink)" },
];
