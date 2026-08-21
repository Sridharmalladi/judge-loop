// Canned content for Demo mode — deliberately fabricated, zero API calls.
// Shows realistic provider/model names (confirmed choice: makes the demo
// feel like the real thing) but the DEMO tab, hover text, and run-page
// banner all label it clearly, so there's no ambiguity about what it is.
import type { AvailableModelsResponse } from "./api";

export const DEMO_GENERATOR_LABEL = "gemini/gemini-3.6-flash";
export const DEMO_JUDGE_LABEL = "groq/compound";

// Real, recognizable provider/model names — never actually called. Static
// so Demo mode works with zero network dependency, even if the backend or
// every real provider is down.
export const DEMO_CATALOG: AvailableModelsResponse = {
  providers: ["gemini", "groq", "openrouter", "huggingface"],
  models: {
    gemini: ["gemini-3.6-flash", "gemini-1.5-pro"],
    groq: ["groq/compound-mini", "groq/compound"],
    openrouter: ["google/gemma-4-31b-it:free", "z-ai/glm-5.2:free"],
    huggingface: ["meta-llama/Llama-3.1-8B-Instruct", "Qwen/Qwen2.5-7B-Instruct-1M"],
  },
};

const DIMENSION_KEYS = ["relevance", "coherence", "completeness", "conciseness", "accuracy", "creativity"];

const STRENGTH_BANK = [
  "Leads with the core answer instead of background",
  "Concrete example makes the idea land",
  "Clean structure, easy to skim",
  "Defines the technical term on first use",
  "Ties the explanation back to something familiar",
];

const WEAKNESS_BANK = [
  "Could use one more concrete example",
  "A couple sentences run long",
  "Doesn't address the edge case explicitly",
  "Opens a little slower than it needs to",
];

const SUGGESTION_BANK = [
  "Trim the opening to get to the point faster",
  "Add a one-line summary at the end",
  "Break the middle section into two shorter beats",
];

function seededPick<T>(arr: T[], n: number, seed: number): T[] {
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

function hashSeed(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 100000;
  return h;
}

// Trends upward across rounds — that's the whole point of the demo: show
// what a healthy self-improvement loop looks like, not real judge noise.
const ROUND_TARGETS = [6.2, 7.6, 8.6, 9.2];

export function demoScore(round: number, seed: number): number {
  const target = ROUND_TARGETS[Math.min(round - 1, ROUND_TARGETS.length - 1)];
  const jitter = (((seed + round * 13) * 37) % 9) / 10 - 0.4;
  return Math.max(3, Math.min(9.8, Math.round((target + jitter) * 10) / 10));
}

export function demoDimensionScores(round: number, seed: number): Record<string, number> {
  const overall = demoScore(round, seed);
  const out: Record<string, number> = {};
  for (const [i, key] of DIMENSION_KEYS.entries()) {
    const jitter = (((seed + i * 7 + round * 3) * 19) % 7) / 10 - 0.3;
    out[key] = Math.max(2, Math.min(10, Math.round((overall + jitter) * 10) / 10));
  }
  return out;
}

function topicFrom(prompt: string): string {
  return prompt.length > 60 ? prompt.slice(0, 60).trim() + "…" : prompt;
}

export function demoResponse(prompt: string, round: number, strategy: string): string {
  const topic = topicFrom(prompt);
  if (strategy === "prompt_optimization" && round > 1) {
    return `Revised instructions, round ${round}: the template now explicitly asks for a concrete example and a shorter opening before addressing "${topic}" — the response below is what that sharper prompt produces.`;
  }
  if (round === 1) {
    return `Here's a first pass on "${topic}": the short version is straightforward, but this draft leans on general statements rather than specifics. It covers the basic shape of the answer without much depth or a concrete example to anchor it — a reasonable starting point, with room to sharpen.`;
  }
  return `Revised for round ${round}: this version tightens the explanation of "${topic}", leads with the core point instead of background, and folds in a concrete example to make the idea stick. Structure is cleaner — shorter sections, one idea per beat — and the earlier vague phrasing is replaced with specifics tied directly to what was asked.`;
}

export function demoCritique(round: number, score: number, seed: number) {
  const strengths = seededPick(STRENGTH_BANK, round === 1 ? 1 : 2, seed + round * 5);
  const weaknesses = score >= 9 ? [] : seededPick(WEAKNESS_BANK, score >= 8 ? 1 : 2, seed + round * 7 + 1);
  const suggestions = score >= 9 ? [] : seededPick(SUGGESTION_BANK, 1, seed + round * 11 + 2);
  const critique =
    score >= 9
      ? "Strong response — hits the rubric across the board, nothing meaningful left to fix."
      : score >= 7.5
        ? "Solid and improving — a couple of small things keep it from a perfect score."
        : "Reasonable start — the core idea is there, next round should tighten it up.";
  return { critique, strengths, weaknesses, suggestions };
}

export function demoSeed(prompt: string): number {
  return hashSeed(prompt || "demo");
}
