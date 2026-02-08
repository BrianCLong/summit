from __future__ import annotations

from typing import Sequence

from .base import SequenceObjectiveInputs, _clip_ratio, _mean, _validate_inputs


def _overlong_penalty(length: int, max_len: int | None, penalty: float) -> float:
    if max_len is None or penalty <= 0:
        return 0.0
    if length <= max_len:
        return 0.0
    return (length - max_len) * penalty


def luspo_terms(
    inputs: SequenceObjectiveInputs,
    *,
    max_len: int | None = None,
    overlong_penalty: float = 0.0,
) -> list[float]:
    _validate_inputs(inputs)
    if inputs.lengths is None:
        raise ValueError("lengths are required for LUSPO")
    terms: list[float] = []
    for ratio, advantage, length in zip(
        inputs.importance_ratios,
        inputs.advantages,
        inputs.lengths,
    ):
        clipped = _clip_ratio(ratio, inputs.clip_range)
        base_term = min(ratio * advantage, clipped * advantage)
        penalty = _overlong_penalty(length, max_len, overlong_penalty)
        terms.append((length * base_term) - penalty)
    return terms


def luspo_objective(
    inputs: SequenceObjectiveInputs,
    *,
    max_len: int | None = None,
    overlong_penalty: float = 0.0,
) -> float:
    terms = luspo_terms(inputs, max_len=max_len, overlong_penalty=overlong_penalty)
    return _mean(terms)
