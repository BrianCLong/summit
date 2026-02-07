from __future__ import annotations

from typing import Sequence

from .base import SequenceObjectiveInputs, _clip_ratio, _mean, _validate_inputs


def gspo_terms(inputs: SequenceObjectiveInputs) -> list[float]:
    _validate_inputs(inputs)
    terms: list[float] = []
    for ratio, advantage in zip(inputs.importance_ratios, inputs.advantages):
        clipped = _clip_ratio(ratio, inputs.clip_range)
        terms.append(min(ratio * advantage, clipped * advantage))
    return terms


def gspo_objective(inputs: SequenceObjectiveInputs) -> float:
    terms = gspo_terms(inputs)
    return _mean(terms)
