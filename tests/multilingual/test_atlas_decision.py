import pytest

from summit.planning.multilingual.atlas.decision import get_pretrain_vs_finetune_decision


def test_crossover_finetune():
    # 100B tokens for 2B model is below 200B threshold
    decision = get_pretrain_vs_finetune_decision(2_000_000_000, "fr", 100_000_000_000)
    assert decision.strategy == "finetune"
    assert "below crossover threshold" in decision.rationale

def test_crossover_pretrain():
    # 300B tokens for 2B model is above 200B threshold
    decision = get_pretrain_vs_finetune_decision(2_000_000_000, "fr", 300_000_000_000)
    assert decision.strategy == "pretrain"
    assert "exceeds crossover threshold" in decision.rationale

def test_crossover_override():
    # Override threshold to 50B
    decision = get_pretrain_vs_finetune_decision(2_000_000_000, "fr", 60_000_000_000, overrides={"fr": 50_000_000_000})
    assert decision.strategy == "pretrain"
    assert decision.threshold_tokens == 50_000_000_000
