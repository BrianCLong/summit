from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class TokenPricing:
    input_per_1k: float
    output_per_1k: float


DEFAULT_PRICING: dict[str, TokenPricing] = {
    "openai:gpt-4o-mini": TokenPricing(input_per_1k=0.15, output_per_1k=0.60),
    "anthropic:claude-3-5-haiku": TokenPricing(input_per_1k=0.25, output_per_1k=1.25),
}


def estimate_cost_usd(
    model_key: str,
    input_tokens: int,
    output_tokens: int,
    pricing_table: dict[str, TokenPricing] | None = None,
) -> float:
    table = pricing_table or DEFAULT_PRICING
    if model_key not in table:
        raise KeyError(f"No token pricing registered for model '{model_key}'")
    pricing = table[model_key]
    return (input_tokens / 1000.0) * pricing.input_per_1k + (
        output_tokens / 1000.0
    ) * pricing.output_per_1k


def cost_per_1k_tokens(total_cost_usd: float, total_tokens: int) -> float:
    if total_tokens <= 0:
        raise ValueError("total_tokens must be greater than zero")
    return (total_cost_usd / float(total_tokens)) * 1000.0
