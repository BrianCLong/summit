"""Configuration primitives for RESB."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Iterable, List, Optional, Sequence

from .constraints import DenialConstraint


@dataclass(frozen=True)
class RESBConfig:
    """Runtime configuration for :class:`RESBGenerator`.

    Attributes
    ----------
    target_column:
        Name of the column containing the binary rare-event labels.
    minority_class:
        Optional value that should be considered the rare class. When omitted
        the class with the lowest frequency is treated as the minority.
    boost_multiplier:
        Factor controlling how many synthetic samples to create relative to the
        existing minority population.
    k_neighbors:
        Number of neighbours to consider when interpolating synthetic samples.
    epsilon / delta:
        Differential privacy budget for the Gaussian mechanism.
    dp_sensitivity:
        Optional per-feature sensitivities. When omitted the numeric range of
        the minority class is used.
    constraints:
        Iterable of denial constraints that must not be violated by the
        generated samples.
    precision_target:
        Target precision that the uplift evaluation should meet or exceed.
    seed:
        Seed that controls the deterministic RNG used throughout the pipeline.
    max_attempts:
        Maximum attempts allowed to sample a constraint-satisfying candidate
        before falling back to the original observation.
    """

    target_column: str
    minority_class: Optional[object] = None
    boost_multiplier: float = 1.0
    k_neighbors: int = 5
    epsilon: float = 3.0
    delta: float = 1e-5
    dp_sensitivity: Optional[dict] = None
    constraints: Sequence[DenialConstraint] = field(default_factory=list)
    precision_target: float = 0.7
    seed: int = 42
    max_attempts: int = 25

    def __post_init__(self) -> None:
        if self.boost_multiplier <= 0:
            raise ValueError("boost_multiplier must be positive")
        if self.k_neighbors < 1:
            raise ValueError("k_neighbors must be >= 1")
        if self.epsilon <= 0:
            raise ValueError("epsilon must be positive")
        if not (0 < self.delta < 1):
            raise ValueError("delta must be between 0 and 1")
        if self.precision_target <= 0 or self.precision_target > 1:
            raise ValueError("precision_target must be within (0, 1]")
        if self.max_attempts < 1:
            raise ValueError("max_attempts must be >= 1")


ConstraintFactory = Callable[[Iterable[str]], List[DenialConstraint]]
