"""Configuration objects for the Red-Teamable Guard Harness (RTGH)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Iterable, List, Optional


@dataclass
class SeededCanary:
    """A deterministic payload expected to trigger a bypass.

    Attributes
    ----------
    gate:
        The canonical name of the target gate adapter.
    payload:
        Arbitrary payload delivered to the adapter.
    severity:
        The expected severity score contributed when the canary is bypassed.
    metadata:
        Optional additional information that will be propagated to reports.
    """

    gate: str
    payload: Any
    severity: float
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FuzzConfig:
    """Configuration controlling a fuzzing session."""

    iterations: int = 128
    seed: int = 0
    chained_seed: Optional[int] = None
    cross_gate_chance: float = 0.35
    ci_mode: bool = False
    seeded_canaries: Iterable[SeededCanary] = field(default_factory=list)
    max_trace: int = 256
    timeout_s: Optional[float] = None
    score_weight: Callable[[float, float], float] = lambda bypass_rate, severity: bypass_rate

    def build_rng_seeds(self) -> Dict[str, int]:
        """Expose deterministic RNG seeds for sub-components."""

        chained_seed = self.seed if self.chained_seed is None else self.chained_seed
        return {
            "payload": self.seed,
            "mutation": self.seed ^ 0xDEADBEEF,
            "chaining": chained_seed,
        }


DEFAULT_CONFIG = FuzzConfig()
