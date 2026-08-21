"""
EVALUATOR — The judge.

Uses an LLM to evaluate another LLM's response on a structured rubric.
This is NOT the model grading itself (unless in self-refine mode) — 
the evaluator is a separate call with a carefully designed judge prompt.

The judge prompt matters more than anything else in this system.
A bad judge prompt = useless scores = the refinement loop chases noise.
"""

import json
import re
import logging
from typing import Optional
from ..models.domain import EvaluationResult, EvaluationCriteria, ModelConfig
from ..adapters.registry import registry

logger = logging.getLogger(__name__)


JUDGE_SYSTEM_PROMPT = """Objectively score an AI assistant's response to a user's prompt. Respond with ONLY a valid JSON object — no markdown, no other text.

Weighted criteria:
{criteria_block}

Scale: 0-2 wrong/harmful, 3-4 partial with gaps, 5-6 adequate, 7-8 good with minor issues, 9-10 excellent.

Also score 0-10 on each dimension independently: relevance (answers what was asked), coherence (logically structured), completeness (covers the topic), conciseness (no padding), accuracy (factually correct), creativity (original insight, not boilerplate).

JSON structure, exactly:
{{
    "score": <float 0-10>,
    "critique": "<2-3 sentence assessment>",
    "strengths": ["<strength 1>", "<strength 2>"],
    "weaknesses": ["<weakness 1>", "<weakness 2>"],
    "suggestions": ["<actionable improvement 1>", "<actionable improvement 2>"],
    "dimension_scores": {{
        "relevance": <float 0-10>,
        "coherence": <float 0-10>,
        "completeness": <float 0-10>,
        "conciseness": <float 0-10>,
        "accuracy": <float 0-10>,
        "creativity": <float 0-10>
    }}
}}"""


JUDGE_USER_PROMPT = """## Original prompt
{original_prompt}

## Response to evaluate
{response}

Evaluate the response above. Respond with ONLY the JSON object."""


def _build_criteria_block(criteria: EvaluationCriteria) -> str:
    """Convert criteria weights into the judge prompt section."""
    lines = []
    if criteria.accuracy > 0:
        lines.append(f"- Accuracy (weight: {criteria.accuracy}): Is the information correct?")
    if criteria.completeness > 0:
        lines.append(f"- Completeness (weight: {criteria.completeness}): Does it cover the topic thoroughly?")
    if criteria.clarity > 0:
        lines.append(f"- Clarity (weight: {criteria.clarity}): Is it easy to understand?")
    if criteria.relevance > 0:
        lines.append(f"- Relevance (weight: {criteria.relevance}): Does it answer what was asked?")
    if criteria.custom_criteria:
        lines.append(f"- Custom: {criteria.custom_criteria}")
    return "\n".join(lines)


def _clamp_score(value) -> float:
    """Judges occasionally return an out-of-range or wrong-typed score
    (e.g. "8/10", or 85 meant as a percentage) — clamp instead of letting
    pydantic's ge=0/le=10 validation raise and crash the whole run."""
    return max(0.0, min(10.0, float(value)))


def _clamp_dimension_scores(raw_dims) -> dict[str, float]:
    """Same unreliable-judge-output problem as the overall score, per axis —
    drop any dimension that isn't a plain number instead of failing the
    whole evaluation over one bad field."""
    if not isinstance(raw_dims, dict):
        return {}
    dims = {}
    for key, value in raw_dims.items():
        try:
            dims[key] = _clamp_score(value)
        except (TypeError, ValueError):
            continue
    return dims


def _result_from(data: dict, raw: str) -> EvaluationResult:
    return EvaluationResult(
        score=_clamp_score(data["score"]),
        critique=data.get("critique", ""),
        strengths=data.get("strengths", []),
        weaknesses=data.get("weaknesses", []),
        suggestions=data.get("suggestions", []),
        dimension_scores=_clamp_dimension_scores(data.get("dimension_scores")),
        raw_judge_response=raw,
    )


def _parse_judge_response(raw: str) -> EvaluationResult:
    """Extract structured evaluation from the judge's response.

    LLMs are unreliable JSON producers, so we try multiple strategies:
    1. Direct parse
    2. Extract JSON from markdown code blocks
    3. Regex fallback for score

    Each tier catches JSON errors, missing/wrong-typed fields (KeyError,
    ValueError, TypeError), and falls through to the next rather than
    letting any of those crash the run — that's the whole point of having
    fallback tiers.
    """
    # Try direct parse
    try:
        data = json.loads(raw.strip())
        return _result_from(data, raw)
    except (json.JSONDecodeError, KeyError, ValueError, TypeError):
        pass

    # Try extracting JSON from markdown code block
    json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    if json_match:
        try:
            data = json.loads(json_match.group(1))
            return _result_from(data, raw)
        except (json.JSONDecodeError, KeyError, ValueError, TypeError):
            pass

    # Try finding JSON object anywhere in the text
    brace_match = re.search(r"\{[^{}]*\"score\"[^{}]*\}", raw, re.DOTALL)
    if brace_match:
        try:
            data = json.loads(brace_match.group(0))
            return _result_from(data, raw)
        except (json.JSONDecodeError, KeyError, ValueError, TypeError):
            pass

    # Last resort: regex for score
    score_match = re.search(r'"?score"?\s*:\s*(-?\d+\.?\d*)', raw)
    score = _clamp_score(score_match.group(1)) if score_match else 5.0

    logger.warning(f"Failed to parse judge JSON, falling back to score={score}")
    return EvaluationResult(
        score=score,
        critique="Judge response could not be fully parsed.",
        raw_judge_response=raw,
    )


async def evaluate(
    original_prompt: str,
    response: str,
    evaluator_config: ModelConfig,
    criteria: Optional[EvaluationCriteria] = None,
) -> EvaluationResult:
    """Run the LLM-as-Judge evaluation.
    
    This is the most critical function in the system.
    A bad evaluation = the refinement loop optimizes for the wrong thing.
    """
    criteria = criteria or EvaluationCriteria()
    criteria_block = _build_criteria_block(criteria)

    system_prompt = JUDGE_SYSTEM_PROMPT.format(criteria_block=criteria_block)
    user_prompt = JUDGE_USER_PROMPT.format(
        original_prompt=original_prompt,
        response=response,
    )

    result = await registry.generate(
        provider=evaluator_config.provider.value,
        model=evaluator_config.model_name,
        prompt=user_prompt,
        system_prompt=system_prompt,
        temperature=0.3,  # Low temp for consistent scoring
        # Reasoning models (gpt-oss-*, nemotron-*) spend tokens on internal
        # "thinking" before the final answer — 800 was proven NOT enough
        # (a reasoning judge exhausted the whole budget mid-thought and
        # never emitted the verdict). 1400 keeps real headroom above that
        # failure point while trimming the worst-case spend below the
        # original 2000 — the trimmed JUDGE_SYSTEM_PROMPT above also cuts
        # fixed input-token overhead on every single judge call.
        max_tokens=1400,
        api_key=evaluator_config.api_key,
    )

    evaluation = _parse_judge_response(result["content"])
    return evaluation
