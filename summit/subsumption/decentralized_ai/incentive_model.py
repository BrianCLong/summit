"""Simple transparency checks for decentralized incentive disclosures."""

from __future__ import annotations

from typing import Any


def incentive_transparency_score(bundle: dict[str, Any]) -> float:
    """Score [0..1] based on disclosure of emission, reward, and slashing rules."""
    keys = ["emission_policy", "reward_distribution", "slashing_policy"]
    disclosed = sum(1 for key in keys if bundle.get(key))
    return disclosed / len(keys)
