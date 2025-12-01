"""Seeded canary helpers."""
from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass, field
from typing import Iterable, List, Sequence


@dataclass
class CanaryCatalog:
    """Stores seeded canaries and their provenance."""

    seed: int
    canaries: List[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.canaries = list(self.canaries)

    def extend(self, phrases: Iterable[str]) -> None:
        self.canaries.extend(phrases)

    def __contains__(self, phrase: str) -> bool:
        return phrase in self.canaries


def _derive_token(seed: int, index: int, prefix: str) -> str:
    payload = f"{prefix}:{seed}:{index}".encode("utf-8")
    digest = hashlib.sha256(payload).hexdigest()[:16]
    return f"{prefix}_{digest}"


def generate_canaries(seed: int, count: int = 8, *, prefix: str = "CANARY") -> CanaryCatalog:
    """Deterministically generate a catalog of canaries."""

    rng = random.Random(seed)
    phrases: List[str] = []
    for idx in range(count):
        token = _derive_token(seed, idx, prefix)
        modifiers = [rng.choice(["alpha", "beta", "gamma", "delta", "omega"]), str(rng.randint(10, 9999))]
        phrases.append(f"{token}-{modifiers[0]}-{modifiers[1]}")
    return CanaryCatalog(seed=seed, canaries=phrases)
