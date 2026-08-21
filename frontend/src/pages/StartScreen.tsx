import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TrackSelectCard from "../components/TrackSelectCard";
import { DEMO_PROMPTS } from "../hooks/mockContent";
import { useLiveModels } from "../hooks/useLiveModels";
import { useByokKeys } from "../hooks/useByokKeys";
import type { RunMode, RunSource } from "../types/domain";

const ROUTES: Record<RunMode, string> = {
  self_refine: "/run/self-refine",
  cross_model: "/run/arena",
  prompt_optimization: "/run/prompt-opt",
};

const SOURCE_LABEL: Record<RunSource, string> = { byok: "BYOK", real: "REAL" };
const SOURCE_ACCENT: Record<RunSource, string> = {
  byok: "var(--color-hud-cyan)",
  real: "var(--color-hud-pink)",
};

const KEY_SIGNUP_URL: Record<string, string> = {
  groq: "https://console.groq.com/keys",
  openrouter: "https://openrouter.ai/keys",
  gemini: "https://aistudio.google.com/apikey",
  huggingface: "https://huggingface.co/settings/tokens",
};

// Keeps input tokens (and therefore cost) predictable — this app's prompts
// are short asks ("explain X", "write a description for Y"), not essays.
const PROMPT_MAX_CHARS = 500;

export default function StartScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const source = (location.state as { source?: RunSource } | null)?.source;

  useEffect(() => {
    if (!source) navigate("/");
  }, [source, navigate]);

  const [prompt, setPrompt] = useState(DEMO_PROMPTS[0]);
  const { data: modelsData, error: modelsError, loading: modelsLoading } = useLiveModels(
    source === "byok" ? "byok" : "real",
  );

  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [evaluatorProvider, setEvaluatorProvider] = useState("");
  const [evaluatorModel, setEvaluatorModel] = useState("");
  const { keys: byokKeys, setKey: setByokKey } = useByokKeys();

  useEffect(() => {
    if (modelsData && modelsData.providers.length > 0 && !provider) {
      const first = modelsData.providers[0];
      setProvider(first);
      const firstModels = modelsData.models[first] ?? [];
      setModel(firstModels[0] ?? "");

      // Default the judge to a genuinely different MODEL, not necessarily a
      // different provider — a second unproven provider is a rate-limit
      // waiting to happen. If the generator's own (often featured) provider
      // has a second model, judge with that; only fall back to a different
      // provider when it doesn't.
      if (firstModels.length > 1) {
        setEvaluatorProvider(first);
        setEvaluatorModel(firstModels[1]);
      } else {
        const judgeProvider = modelsData.providers[1] ?? first;
        setEvaluatorProvider(judgeProvider);
        setEvaluatorModel(modelsData.models[judgeProvider]?.[0] ?? "");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelsData]);

  const featured = modelsData?.featured ?? [];
  const hasGeneratorKey = source !== "byok" || Boolean(byokKeys[provider]);
  const hasEvaluatorKey = source !== "byok" || Boolean(byokKeys[evaluatorProvider]);
  const canRunReal = Boolean(provider && model && !modelsError && hasGeneratorKey);
  const canRunArena = Boolean(canRunReal && evaluatorProvider && evaluatorModel && hasEvaluatorKey);

  if (!source) return null;

  function go(mode: RunMode) {
    const cleanPrompt = prompt.trim().slice(0, PROMPT_MAX_CHARS) || DEMO_PROMPTS[0];
    const base = { prompt: cleanPrompt, provider, model };
    const withKey = source === "byok" ? { generatorApiKey: byokKeys[provider] } : {};
    if (mode === "cross_model") {
      if (!canRunArena) return;
      const evalKey = source === "byok" ? { evaluatorApiKey: byokKeys[evaluatorProvider] } : {};
      navigate(ROUTES[mode], { state: { ...base, ...withKey, evaluatorProvider, evaluatorModel, ...evalKey } });
      return;
    }
    if (!canRunReal) return;
    navigate(ROUTES[mode], { state: { ...base, ...withKey } });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-10 text-center">
        <h1 className="font-pixel text-lg text-hud-green sm:text-2xl" style={{ textShadow: "0 0 16px var(--color-hud-green)" }}>
          JUDGE LOOP
        </h1>
        <p className="mt-3 text-sm text-hud-text-dim">
          Pick a track. Watch an LLM improve its own answer, lap after lap.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <span
            className="rounded-sm border-2 px-3 py-1 font-pixel text-[10px]"
            style={{ borderColor: SOURCE_ACCENT[source], color: SOURCE_ACCENT[source] }}
          >
            {SOURCE_LABEL[source]} MODE
          </span>
          <button
            onClick={() => navigate("/")}
            className="text-[11px] text-hud-text-dim underline hover:text-hud-cyan"
          >
            change
          </button>
        </div>
        {source === "byok" && (
          <p className="mt-3 text-xs text-hud-cyan">
            Your key is used only for this run and kept in this browser tab — never sent anywhere but this app,
            never stored on the server.
          </p>
        )}
      </header>

      <div className="mx-auto mb-6 max-w-2xl rounded-md border-2 border-chrome-border bg-chrome p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <label className="block text-xs uppercase tracking-wide text-hud-text-dim">Your prompt</label>
          <span className="text-[11px] text-hud-text-dim">
            {prompt.length}/{PROMPT_MAX_CHARS}
          </span>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, PROMPT_MAX_CHARS))}
          maxLength={PROMPT_MAX_CHARS}
          rows={3}
          className="w-full resize-none rounded-sm border-2 border-chrome-border bg-chrome-dark p-3 font-mono text-sm text-hud-text outline-none focus:border-hud-green"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {DEMO_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => setPrompt(p)}
              className="rounded-sm border border-dashed border-chrome-border px-2 py-1 text-[11px] text-hud-text-dim hover:border-hud-cyan hover:text-hud-cyan"
            >
              {p.length > 42 ? p.slice(0, 42) + "…" : p}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto mb-6 max-w-2xl rounded-md border-2 border-chrome-border bg-chrome p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <label className="block text-xs uppercase tracking-wide text-hud-text-dim">
            Model — generator (Self-Refine / Prompt Opt / Cross-Model)
          </label>
          {featured.length > 0 && <span className="text-[11px] text-hud-text-dim">🔥 = most reliable now</span>}
        </div>
        {modelsLoading && <p className="text-sm text-hud-text-dim">Connecting to backend…</p>}
        {modelsError && (
          <p className="text-sm text-hud-pink">
            Backend unreachable at localhost:8000 — is it running? {SOURCE_LABEL[source]} mode needs it.
          </p>
        )}
        {modelsData && modelsData.providers.length === 0 && (
          <p className="text-sm text-hud-pink">Backend has no provider API keys configured.</p>
        )}
        {modelsData && modelsData.providers.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={provider}
                onChange={(e) => {
                  const p = e.target.value;
                  setProvider(p);
                  setModel(modelsData.models[p]?.[0] ?? "");
                }}
                className="rounded-sm border-2 border-chrome-border bg-chrome-dark p-2 font-mono text-sm text-hud-text outline-none focus:border-hud-green"
              >
                {modelsData.providers.map((p) => (
                  <option key={p} value={p}>
                    {featured.includes(p) ? "🔥 " : ""}
                    {p}
                  </option>
                ))}
              </select>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="rounded-sm border-2 border-chrome-border bg-chrome-dark p-2 font-mono text-sm text-hud-text outline-none focus:border-hud-green"
              >
                {(modelsData.models[provider] ?? []).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            {source === "byok" && (
              <ApiKeyField
                provider={provider}
                value={byokKeys[provider] ?? ""}
                onChange={(v) => setByokKey(provider, v)}
                accent="var(--color-hud-green)"
              />
            )}
          </>
        )}
      </div>

      {modelsData && modelsData.providers.length > 0 && (
        <div className="mx-auto mb-10 max-w-2xl rounded-md border-2 border-chrome-border bg-chrome p-4">
          <label className="mb-2 block text-xs uppercase tracking-wide text-hud-text-dim">
            Judge model — for Cross-Model only
          </label>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={evaluatorProvider}
              onChange={(e) => {
                const p = e.target.value;
                setEvaluatorProvider(p);
                setEvaluatorModel(modelsData.models[p]?.[0] ?? "");
              }}
              className="rounded-sm border-2 border-chrome-border bg-chrome-dark p-2 font-mono text-sm text-hud-text outline-none focus:border-hud-pink"
            >
              {modelsData.providers.map((p) => (
                <option key={p} value={p}>
                  {featured.includes(p) ? "🔥 " : ""}
                  {p}
                </option>
              ))}
            </select>
            <select
              value={evaluatorModel}
              onChange={(e) => setEvaluatorModel(e.target.value)}
              className="rounded-sm border-2 border-chrome-border bg-chrome-dark p-2 font-mono text-sm text-hud-text outline-none focus:border-hud-pink"
            >
              {(modelsData.models[evaluatorProvider] ?? []).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          {source === "byok" && (
            <ApiKeyField
              provider={evaluatorProvider}
              value={byokKeys[evaluatorProvider] ?? ""}
              onChange={(v) => setByokKey(evaluatorProvider, v)}
              accent="var(--color-hud-pink)"
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <TrackSelectCard
          title="SELF-REFINE"
          description="One model generates, judges its own work, and rewrites — round after round."
          accent="var(--color-hud-green)"
          icon={<CarIcon />}
          onSelect={() => go("self_refine")}
          disabled={!canRunReal}
          disabledReason={disabledReason(source, modelsError, hasGeneratorKey)}
        />
        <TrackSelectCard
          title="CROSS-MODEL"
          description="One model answers, a different model judges it — feedback loops back for a sharper next round."
          accent="var(--color-hud-cyan)"
          icon={<FlagIcon />}
          onSelect={() => go("cross_model")}
          disabled={!canRunArena}
          disabledReason={disabledReason(source, modelsError, hasGeneratorKey && hasEvaluatorKey)}
        />
        <TrackSelectCard
          title="PROMPT OPT"
          description="Instead of the answer, the instructions themselves evolve each round."
          accent="var(--color-hud-pink)"
          icon={<GearIcon />}
          onSelect={() => go("prompt_optimization")}
          disabled={!canRunReal}
          disabledReason={disabledReason(source, modelsError, hasGeneratorKey)}
        />
      </div>

      <p
        className="mt-10 text-center text-[11px] text-hud-text-dim"
        style={{ textShadow: "0 0 6px var(--color-chrome-dark), 0 0 6px var(--color-chrome-dark)" }}
      >
        {source === "byok"
          ? "BYOK mode — calls run with your own API key(s), sent only for the run you start."
          : "Real mode — calls run through this app's own backend keys."}
      </p>
    </div>
  );
}

function disabledReason(source: RunSource, modelsError: string | null, hasKey: boolean): string {
  if (source === "byok" && !hasKey) return "Enter your API key above";
  if (modelsError) return "Backend unreachable";
  return "Waiting on model list from backend…";
}

function ApiKeyField({
  provider,
  value,
  onChange,
  accent,
}: {
  provider: string;
  value: string;
  onChange: (v: string) => void;
  accent: string;
}) {
  if (!provider) return null;
  const signupUrl = KEY_SIGNUP_URL[provider];
  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs uppercase tracking-wide text-hud-text-dim">Your {provider} API key</label>
        {signupUrl && (
          <a
            href={signupUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-hud-text-dim underline hover:text-hud-cyan"
          >
            get one free →
          </a>
        )}
      </div>
      <input
        type="password"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Paste your ${provider} key…`}
        className="w-full rounded-sm border-2 bg-chrome-dark p-2 font-mono text-sm text-hud-text outline-none"
        style={{ borderColor: value ? accent : "var(--color-chrome-border)" }}
      />
    </div>
  );
}

function CarIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="8" width="14" height="4" />
      <rect x="3" y="5" width="10" height="4" />
      <rect x="2" y="12" width="2" height="2" />
      <rect x="12" y="12" width="2" height="2" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor">
      <rect x="3" y="1" width="2" height="14" />
      <rect x="5" y="2" width="2" height="2" />
      <rect x="9" y="2" width="2" height="2" />
      <rect x="7" y="4" width="2" height="2" />
      <rect x="5" y="6" width="2" height="2" />
      <rect x="9" y="6" width="2" height="2" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor">
      <rect x="7" y="1" width="2" height="3" />
      <rect x="7" y="12" width="2" height="3" />
      <rect x="1" y="7" width="3" height="2" />
      <rect x="12" y="7" width="3" height="2" />
      <rect x="5" y="5" width="6" height="6" />
    </svg>
  );
}
