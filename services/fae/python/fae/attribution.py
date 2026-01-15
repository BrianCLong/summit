"""Attribution strategies for securely aggregated paths."""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Mapping

Path = tuple[str, ...]


def shapley_attribution(path_conversions: Mapping[Path, float]) -> dict[str, float]:
    contributions: dict[str, float] = defaultdict(float)
    total = 0.0
    for path, conversions in path_conversions.items():
        unique = []
        for channel in path:
            if channel not in unique:
                unique.append(channel)
        if not unique:
            continue
        weight = conversions / len(unique)
        for channel in unique:
            contributions[channel] += weight
        total += conversions
    if total <= 0:
        return dict(contributions)
    return {channel: value / total for channel, value in contributions.items()}


def markov_attribution(path_conversions: Mapping[Path, float]) -> dict[str, float]:
    total = sum(path_conversions.values())
    if total <= 0:
        return {}

    removal_effects: dict[str, float] = defaultdict(float)
    channels = set(channel for path in path_conversions for channel in path)

    for channel in channels:
        affected = sum(
            conversions for path, conversions in path_conversions.items() if channel in path
        )
        removal_effect = affected / total
        removal_effects[channel] = max(removal_effect, 0.0)

    effect_sum = sum(removal_effects.values())
    if effect_sum == 0:
        return dict.fromkeys(removal_effects, 0.0)
    return {channel: effect / effect_sum for channel, effect in removal_effects.items()}
