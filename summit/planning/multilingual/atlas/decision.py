from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional


@dataclass(frozen=True)
class CrossoverDecision:
    strategy: str  # "pretrain" or "finetune"
    threshold_tokens: int
    rationale: str

def get_pretrain_vs_finetune_decision(
    model_size_params: int,
    target_language: str,
    token_budget: int,
    overrides: Optional[dict[str, int]] = None
) -> CrossoverDecision:
    """
    Heuristic for pretrain vs finetune decision.
    For 2B models, the crossover is ~144B–283B tokens.
    """
    # Defaults for 2B
    BASE_CROSSOVER = 200_000_000_000 # 200B tokens

    # Scale crossover based on model size (rough heuristic)
    # If N is larger, crossover might be higher.
    # We use log-scaling from 2B baseline.
    if model_size_params <= 0:
        model_size_params = 2_000_000_000 # Default to 2B if unknown

    scale_factor = model_size_params / 2_000_000_000
    threshold = int(BASE_CROSSOVER * scale_factor)

    if overrides and target_language in overrides:
        threshold = overrides[target_language]

    if token_budget >= threshold:
        strategy = "pretrain"
        rationale = f"Token budget {token_budget} exceeds crossover threshold {threshold}; pretraining from scratch recommended."
    else:
        strategy = "finetune"
        rationale = f"Token budget {token_budget} below crossover threshold {threshold}; finetuning from checkpoint recommended."

    return CrossoverDecision(
        strategy=strategy,
        threshold_tokens=threshold,
        rationale=rationale
    )
