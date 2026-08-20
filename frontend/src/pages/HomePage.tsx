import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getModels } from "../api";
import type { AvailableModelsResponse, ModelProvider, RefinementStrategy, StartRunRequest } from "../types";

const STRATEGIES: { value: RefinementStrategy; label: string; hint: string }[] = [
  { value: "self_refine", label: "SELF-REFINE", hint: "One model generates and judges itself" },
  { value: "cross_model", label: "CROSS-MODEL", hint: "A second model judges the first" },
  { value: "prompt_optimization", label: "PROMPT OPT", hint: "Phase 3 — evolves like self-refine for now" },
];

const PRESETS = [
  {
    label: "Explain quantum entanglement to a 10-year-old",
    prompt:
      "Explain quantum entanglement to a 10-year-old, using an analogy they'd understand from everyday life.",
  },
  {
    label: "Write a product description for wireless earbuds",
    prompt:
      "Write a compelling product description for a pair of wireless noise-cancelling earbuds, aimed at commuters.",
  },
  {
    label: "Debug: why does this function return NaN?",
    prompt:
      "Here's a JS function that sometimes returns NaN:\n\nfunction average(nums) {\n  return nums.reduce((a, b) => a + b) / nums.length;\n}\n\nExplain every scenario where this breaks, and rewrite it to be robust.",
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [modelsData, setModelsData] = useState<AvailableModelsResponse | null>(null);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const [strategy, setStrategy] = useState<RefinementStrategy>("self_refine");
  const [prompt, setPrompt] = useState("");
  const [generatorProvider, setGeneratorProvider] = useState<ModelProvider | "">("");
  const [generatorModel, setGeneratorModel] = useState("");
  const [evaluatorProvider, setEvaluatorProvider] = useState<ModelProvider | "">("");
  const [evaluatorModel, setEvaluatorModel] = useState("");
  const [maxIterations, setMaxIterations] = useState(5);
  const [temperature, setTemperature] = useState(0.7);

  useEffect(() => {
    getModels()
      .then((data) => {
        setModelsData(data);
        const first = data.providers[0] as ModelProvider | undefined;
        if (first) {
          setGeneratorProvider(first);
          setGeneratorModel(data.models[first]?.[0] ?? "");
        }
      })
      .catch((e) => setModelsError(String(e.message ?? e)));
  }, []);

  const providers = modelsData?.providers ?? [];
  const generatorModels = generatorProvider ? modelsData?.models[generatorProvider] ?? [] : [];
  const evaluatorModels = evaluatorProvider ? modelsData?.models[evaluatorProvider] ?? [] : [];

  const canStart =
    prompt.trim().length > 0 &&
    generatorProvider &&
    generatorModel &&
    (strategy !== "cross_model" || (evaluatorProvider && evaluatorModel));

  function handleStart() {
    if (!canStart) return;
    const req: StartRunRequest = {
      prompt: prompt.trim(),
      strategy,
      generator_provider: generatorProvider as ModelProvider,
      generator_model: generatorModel,
      evaluator_provider: strategy === "cross_model" ? (evaluatorProvider as ModelProvider) : null,
      evaluator_model: strategy === "cross_model" ? evaluatorModel : null,
      temperature,
      max_tokens: 1024,
      max_iterations: maxIterations,
      convergence_threshold: 0.5,
      custom_criteria: null,
    };
    navigate("/live", { state: { req } });
  }

  return (
    <div>
      {modelsError && (
        <div className="error-banner">
          Could not reach backend at localhost:8000 — is it running? ({modelsError})
        </div>
      )}

      <div className="panel">
        <h3 className="panel-title">1. CHOOSE MODE</h3>
        <div className="mode-toggle">
          {STRATEGIES.map((s) => (
            <button
              key={s.value}
              className={strategy === s.value ? "selected" : ""}
              onClick={() => setStrategy(s.value)}
              title={s.hint}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="critique-text" style={{ marginTop: 10 }}>
          {STRATEGIES.find((s) => s.value === strategy)?.hint}
        </p>
      </div>

      <div className="panel">
        <h3 className="panel-title">2. PICK MODEL{strategy === "cross_model" ? "S" : ""}</h3>
        <div className="field-row">
          <div className="field">
            <label>Generator provider</label>
            <select
              value={generatorProvider}
              onChange={(e) => {
                const p = e.target.value as ModelProvider;
                setGeneratorProvider(p);
                setGeneratorModel(modelsData?.models[p]?.[0] ?? "");
              }}
            >
              <option value="" disabled>
                {providers.length ? "Select provider" : "No providers configured"}
              </option>
              {providers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Generator model</label>
            <select value={generatorModel} onChange={(e) => setGeneratorModel(e.target.value)}>
              {generatorModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {strategy === "cross_model" && (
          <div className="field-row">
            <div className="field">
              <label>Evaluator provider</label>
              <select
                value={evaluatorProvider}
                onChange={(e) => {
                  const p = e.target.value as ModelProvider;
                  setEvaluatorProvider(p);
                  setEvaluatorModel(modelsData?.models[p]?.[0] ?? "");
                }}
              >
                <option value="" disabled>
                  Select provider
                </option>
                {providers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Evaluator model</label>
              <select value={evaluatorModel} onChange={(e) => setEvaluatorModel(e.target.value)}>
                {evaluatorModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="field-row">
          <div className="field">
            <label>Max iterations</label>
            <input
              type="number"
              min={1}
              max={10}
              value={maxIterations}
              onChange={(e) => setMaxIterations(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Temperature</label>
            <input
              type="number"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="panel">
        <h3 className="panel-title">3. ENTER PROMPT</h3>
        <div className="field">
          <textarea
            rows={6}
            placeholder="Type your prompt, or click a preset below..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
        <label style={{ display: "block", color: "var(--text-dim)", fontSize: 16, marginBottom: 6 }}>
          Demo presets
        </label>
        <div className="preset-list">
          {PRESETS.map((p) => (
            <button key={p.label} className="preset-item" onClick={() => setPrompt(p.prompt)}>
              ▸ {p.label}
            </button>
          ))}
        </div>
      </div>

      <button className="btn btn-primary" disabled={!canStart} onClick={handleStart}>
        ▶ START REFINEMENT
      </button>
    </div>
  );
}
