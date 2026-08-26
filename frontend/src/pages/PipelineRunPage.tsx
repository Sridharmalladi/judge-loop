import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import HudBar from "../components/HudBar";
import StepCard from "../components/StepCard";
import ProgressTrack from "../components/ProgressTrack";
import EventTicker from "../components/EventTicker";
import PixelCharacter from "../components/PixelCharacter";
import SpeechBubble from "../components/SpeechBubble";
import Leaderboard from "../components/Leaderboard";
import { useRealPipelineRun } from "../hooks/useRealPipelineRun";
import { stepsToCharacterState, stepsToJudgeState } from "../lib/characterState";
import type { PipelineRunState, RoundResult } from "../types/domain";

type Variant = "self_refine" | "prompt_optimization" | "cross_model";

// Round N vs round N-1 (not "vs the best round ever") — that's the actual
// question a flat/declining score raises: did this specific revision help.
// The explanation is built entirely from this run's own real judge output —
// the per-dimension scores and the judge's actual weakness notes — not a
// canned "judges are inconsistent" disclaimer.
function explainScoreTrend(history: RoundResult[]): string | null {
  if (history.length < 2) return null;
  const last = history[history.length - 1];
  const prev = history[history.length - 2];
  if (last.score > prev.score) return null; // genuinely improved, nothing to explain

  const lastDims = last.steps.find((s) => s.kind === "evaluation")?.scores ?? [];
  const prevDims = prev.steps.find((s) => s.kind === "evaluation")?.scores ?? [];
  const drops = lastDims
    .map((d) => {
      const before = prevDims.find((p) => p.label === d.label)?.value;
      return before != null ? { label: d.label, before, after: d.value } : null;
    })
    .filter((d): d is { label: string; before: number; after: number } => d != null && d.before > d.after)
    .sort((a, b) => b.before - b.after - (a.before - a.after));

  const weaknesses = last.steps.find((s) => s.kind === "critique")?.weaknesses ?? [];

  const trend =
    last.score === prev.score
      ? `Round ${last.round} scored identically to round ${prev.round} (${last.score}/100 both times).`
      : `Round ${last.round} scored lower than round ${prev.round} (${prev.score} → ${last.score}).`;

  const byDimension =
    drops.length > 0
      ? ` The drop is concentrated in ${drops
          .slice(0, 2)
          .map((d) => `${d.label} (${d.before} → ${d.after})`)
          .join(" and ")}.`
      : "";

  const judgeNotes = weaknesses.length > 0 ? ` The judge's own notes on round ${last.round}: ${weaknesses.join("; ")}.` : "";

  return `${trend}${byDimension}${judgeNotes}`;
}

// 3 rounds, not 4 — each round is 1-2 real API calls, and this is the
// single biggest lever on token spend short of the user cutting a run
// short themselves. Still enough rounds to show a real refine trajectory.
const MAX_ROUNDS = 3;

interface RunLocationState {
  prompt?: string;
  provider?: string;
  model?: string;
  evaluatorProvider?: string;
  evaluatorModel?: string;
  generatorApiKey?: string;
  evaluatorApiKey?: string;
}

export default function PipelineRunPage({ variant }: { variant: Variant }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { prompt, provider, model, evaluatorProvider, evaluatorModel, generatorApiKey, evaluatorApiKey } =
    (location.state as RunLocationState | null) ?? {};
  const isCrossModel = variant === "cross_model";
  const hasJudge = Boolean(evaluatorProvider && evaluatorModel);

  useEffect(() => {
    if (!prompt || !provider || !model) navigate("/");
    else if (isCrossModel && !hasJudge) navigate("/");
  }, [prompt, provider, model, isCrossModel, hasJudge, navigate]);

  const { state, error, generatorLabel, evaluatorLabel } = useRealPipelineRun({
    prompt: prompt ?? "",
    strategy: variant,
    provider: provider ?? "",
    model: model ?? "",
    maxRounds: MAX_ROUNDS,
    evaluatorProvider,
    evaluatorModel,
    apiKey: generatorApiKey,
    evaluatorApiKey,
  });

  if (!prompt || !provider || !model || (isCrossModel && !hasJudge)) return null;

  return (
    <RunView
      variant={variant}
      provider={provider}
      state={state}
      error={error}
      generatorLabel={generatorLabel}
      evaluatorLabel={evaluatorLabel}
    />
  );
}

function RunView({
  variant,
  provider,
  state,
  error,
  generatorLabel,
  evaluatorLabel,
}: {
  variant: Variant;
  provider: string;
  state: PipelineRunState;
  error: string | null;
  generatorLabel: string;
  evaluatorLabel: string;
}) {
  const navigate = useNavigate();
  const isCrossModel = variant === "cross_model";
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const currentScore = state.history[state.history.length - 1]?.score ?? null;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [state.round]);

  const selectedSnapshot = selectedRound != null ? state.history.find((h) => h.round === selectedRound) : null;
  const stepsToShow = selectedSnapshot ? selectedSnapshot.steps : state.steps;
  const scoreTrend = explainScoreTrend(state.history);
  // A hard "sad" reaction is only warranted when the run produced nothing —
  // an error after some rounds already scored is a stopped-early success,
  // not a failure, and the character/banner below both reflect that.
  const hardError = !!error && state.history.length === 0;
  const generator = stepsToCharacterState(state.steps, state.isDone, hardError);
  const judge = stepsToJudgeState(state.steps, state.isDone, hardError, currentScore);

  return (
    <div>
      <HudBar
        mode={variant}
        model={generatorLabel}
        provider={provider}
        evaluator={isCrossModel ? evaluatorLabel : undefined}
        round={state.round}
        maxRounds={state.maxRounds}
        elapsedMs={state.elapsedMs}
        tokenCount={state.tokenCount}
        score={currentScore}
      />

      <div className="mx-auto max-w-5xl px-4 py-8">
        {isCrossModel ? (
          <div className="mb-6 flex items-center justify-around gap-4 rounded-md border-2 border-chrome-border bg-chrome p-4">
            <div className="flex flex-col items-center gap-2">
              <span className="font-pixel text-[9px] text-hud-green">GENERATOR</span>
              <PixelCharacter state={generator.state} color="var(--color-hud-green)" size={52} />
              <SpeechBubble text={generator.caption} color="var(--color-hud-green)" />
            </div>
            <span className="font-pixel text-lg text-hud-text-dim">⚔</span>
            <div className="flex flex-col items-center gap-2">
              <span className="font-pixel text-[9px] text-hud-pink">JUDGE</span>
              <PixelCharacter state={judge.state} color="var(--color-hud-pink)" size={52} flip />
              <SpeechBubble text={judge.caption} color="var(--color-hud-pink)" />
            </div>
          </div>
        ) : (
          <div className="mb-6 flex items-center gap-3 rounded-md border-2 border-chrome-border bg-chrome p-3">
            <PixelCharacter state={generator.state} size={48} />
            <SpeechBubble text={generator.caption} />
          </div>
        )}

        <div className="mb-6">
          <ProgressTrack
            round={state.round}
            maxRounds={state.maxRounds}
            history={state.history}
            selectedRound={selectedRound}
            onSelectRound={setSelectedRound}
          />
        </div>

        {error && state.history.length === 0 && (
          <div className="mb-6 rounded-md border-2 border-hud-pink bg-chrome p-4 text-center">
            <p className="font-pixel text-xs text-hud-pink">✕ ERROR</p>
            <p className="mt-2 text-sm text-hud-text-dim">{error}</p>
            <button
              onClick={() => navigate("/")}
              className="mt-4 rounded-sm border-2 border-hud-pink px-4 py-2 font-pixel text-[10px] text-hud-pink hover:bg-hud-pink hover:text-chrome-dark"
            >
              BACK
            </button>
          </div>
        )}

        {state.isDone && state.history.length > 0 && (
          <div
            className="mb-6 rounded-md border-2 bg-chrome p-4 text-center"
            style={{ borderColor: error ? "var(--color-hud-amber)" : "var(--color-hud-green)" }}
          >
            <p className="font-pixel text-xs" style={{ color: error ? "var(--color-hud-amber)" : "var(--color-hud-green)" }}>
              {error ? "⚠ STOPPED EARLY" : "✓ FINISHED"}
            </p>
            <p className="mt-2 text-sm text-hud-text-dim">
              Score: {state.history.map((h) => h.score).join(" → ")} over {state.history.length} round
              {state.history.length === 1 ? "" : "s"}
            </p>
            {scoreTrend && (
              <p className="mt-1 text-xs text-hud-amber">
                {scoreTrend} Check "Round Ranking" below to compare every round.
              </p>
            )}
            {error && <p className="mt-1 text-xs text-hud-pink">{error}</p>}
            <button
              onClick={() => navigate("/")}
              className={
                error
                  ? "mt-4 rounded-sm border-2 border-hud-amber px-4 py-2 font-pixel text-[10px] text-hud-amber hover:bg-hud-amber hover:text-chrome-dark"
                  : "mt-4 rounded-sm border-2 border-hud-green px-4 py-2 font-pixel text-[10px] text-hud-green hover:bg-hud-green hover:text-chrome-dark"
              }
            >
              NEW RUN
            </button>
          </div>
        )}

        {state.isDone && state.history.length > 1 && (
          <div className="mb-6">
            <Leaderboard history={state.history} />
          </div>
        )}

        {selectedSnapshot && (
          <div className="mb-4 flex items-center justify-between rounded-md border-2 border-hud-amber bg-chrome px-4 py-2">
            <span className="font-pixel text-[10px] text-hud-amber">
              REVIEWING ROUND {selectedSnapshot.round} · SCORE {selectedSnapshot.score}
            </span>
            <button
              onClick={() => setSelectedRound(null)}
              className="rounded-sm border border-hud-amber px-2 py-1 text-[11px] text-hud-amber hover:bg-hud-amber hover:text-chrome-dark"
            >
              clear
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {stepsToShow.map((step) => (
            <StepCard key={step.kind} step={step} />
          ))}
        </div>
      </div>

      <EventTicker entries={state.tickerLog} />
    </div>
  );
}
