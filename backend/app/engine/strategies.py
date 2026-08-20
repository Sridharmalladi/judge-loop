"""
STRATEGIES — The playbook for each mode.

This is the Strategy Pattern: the refinement engine calls strategy.build_prompt()
and strategy.get_evaluator_config() without knowing which mode it's running.
Each strategy decides HOW to refine.

SELF_REFINE: Same model generates and evaluates. The feedback is injected
             into the next prompt as "here's what the judge said, try again."

CROSS_MODEL: Different model evaluates. Same feedback injection, but the
             judge is a separate model that might catch different things.

PROMPT_OPTIMIZATION: The prompt TEMPLATE evolves. Instead of refining one
                     response, we refine the instructions themselves across
                     a test set. (Phase 3 — stubbed for now, architecture ready.)
"""

from abc import ABC, abstractmethod
from typing import Optional
from ..models.domain import (
    ModelConfig, EvaluationResult, RefinementStrategy, Iteration
)


class RefinementStrategyBase(ABC):
    """Abstract base — every strategy implements these."""

    @abstractmethod
    def build_generation_prompt(
        self,
        original_prompt: str,
        previous_iterations: list[Iteration],
    ) -> str:
        """Build the prompt for the NEXT generation attempt.
        First iteration: just the original prompt.
        Later iterations: original + feedback from previous evaluations.
        """
        ...

    @abstractmethod
    def get_evaluator_config(
        self,
        generator_config: ModelConfig,
        evaluator_config: Optional[ModelConfig],
    ) -> ModelConfig:
        """Decide which model evaluates. Self-refine → same model. Cross → different."""
        ...

    @property
    @abstractmethod
    def strategy_type(self) -> RefinementStrategy:
        ...


class SelfRefineStrategy(RefinementStrategyBase):
    """
    SELF-REFINE: The model critiques and revises its own output.
    
    How it works:
    1. Model generates a response
    2. SAME model evaluates that response (as judge)
    3. Evaluation feedback is prepended to the next prompt
    4. Model generates again with the critique in context
    """

    @property
    def strategy_type(self) -> RefinementStrategy:
        return RefinementStrategy.SELF_REFINE

    def build_generation_prompt(
        self,
        original_prompt: str,
        previous_iterations: list[Iteration],
    ) -> str:
        if not previous_iterations:
            return original_prompt

        # Build feedback chain from ALL previous iterations
        last = previous_iterations[-1]
        feedback_block = self._format_feedback(last)

        return f"""## Original task
{original_prompt}

## Your previous attempt (scored {last.evaluation.score}/10)
{last.response}

## Judge's feedback
{feedback_block}

## Your job
Write an improved response that addresses ALL the feedback above. 
Focus especially on the weaknesses and suggestions. 
Do NOT mention the feedback or scoring — just give the improved answer directly."""

    def get_evaluator_config(
        self,
        generator_config: ModelConfig,
        evaluator_config: Optional[ModelConfig],
    ) -> ModelConfig:
        # Self-refine: same model judges itself
        return generator_config

    def _format_feedback(self, iteration: Iteration) -> str:
        parts = [f"Critique: {iteration.evaluation.critique}"]
        if iteration.evaluation.strengths:
            parts.append("Strengths: " + "; ".join(iteration.evaluation.strengths))
        if iteration.evaluation.weaknesses:
            parts.append("Weaknesses: " + "; ".join(iteration.evaluation.weaknesses))
        if iteration.evaluation.suggestions:
            parts.append("Suggestions: " + "; ".join(iteration.evaluation.suggestions))
        return "\n".join(parts)


class CrossModelStrategy(RefinementStrategyBase):
    """
    CROSS-MODEL: Model A generates, Model B evaluates.
    
    Same feedback loop as self-refine, but the judge is a different model.
    This catches biases the generator has — a model can't see its own blind spots,
    but a different architecture might.
    """

    @property
    def strategy_type(self) -> RefinementStrategy:
        return RefinementStrategy.CROSS_MODEL

    def build_generation_prompt(
        self,
        original_prompt: str,
        previous_iterations: list[Iteration],
    ) -> str:
        if not previous_iterations:
            return original_prompt

        last = previous_iterations[-1]
        feedback_block = self._format_feedback(last)

        return f"""## Original task
{original_prompt}

## Your previous attempt (scored {last.evaluation.score}/10 by an external judge)
{last.response}

## External judge's feedback
{feedback_block}

## Your job
Write an improved response addressing the external judge's feedback.
Do NOT mention the feedback or scoring — just give the improved answer directly."""

    def get_evaluator_config(
        self,
        generator_config: ModelConfig,
        evaluator_config: Optional[ModelConfig],
    ) -> ModelConfig:
        if evaluator_config is None:
            raise ValueError("Cross-model strategy requires a separate evaluator config")
        return evaluator_config

    def _format_feedback(self, iteration: Iteration) -> str:
        parts = [f"Critique: {iteration.evaluation.critique}"]
        if iteration.evaluation.weaknesses:
            parts.append("Weaknesses: " + "; ".join(iteration.evaluation.weaknesses))
        if iteration.evaluation.suggestions:
            parts.append("Suggestions: " + "; ".join(iteration.evaluation.suggestions))
        return "\n".join(parts)


class PromptOptimizationStrategy(RefinementStrategyBase):
    """
    PROMPT OPTIMIZATION: The system prompt template evolves.
    
    Instead of refining a single response, we refine the INSTRUCTIONS.
    The template is tested across multiple prompts, scored in aggregate,
    and the template itself is revised based on where it performed worst.
    
    This is a simplified version of DSPy's approach.
    Phase 3 implementation — architecture is ready.
    """

    @property
    def strategy_type(self) -> RefinementStrategy:
        return RefinementStrategy.PROMPT_OPTIMIZATION

    def build_generation_prompt(
        self,
        original_prompt: str,
        previous_iterations: list[Iteration],
    ) -> str:
        # Phase 3: For now, same as self-refine
        # Full implementation will evolve the template, not the response
        if not previous_iterations:
            return original_prompt

        last = previous_iterations[-1]
        return f"""## Original task
{original_prompt}

## Previous attempt (scored {last.evaluation.score}/10)
{last.response}

## Feedback
{last.evaluation.critique}
Weaknesses: {'; '.join(last.evaluation.weaknesses)}
Suggestions: {'; '.join(last.evaluation.suggestions)}

## Improve the response based on the feedback above."""

    def get_evaluator_config(
        self,
        generator_config: ModelConfig,
        evaluator_config: Optional[ModelConfig],
    ) -> ModelConfig:
        return evaluator_config or generator_config


# ── Strategy factory ──

def get_strategy(strategy_type: RefinementStrategy) -> RefinementStrategyBase:
    """Factory function — maps enum to strategy instance."""
    strategies = {
        RefinementStrategy.SELF_REFINE: SelfRefineStrategy,
        RefinementStrategy.CROSS_MODEL: CrossModelStrategy,
        RefinementStrategy.PROMPT_OPTIMIZATION: PromptOptimizationStrategy,
    }
    cls = strategies.get(strategy_type)
    if not cls:
        raise ValueError(f"Unknown strategy: {strategy_type}")
    return cls()
