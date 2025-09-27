"""Canned attack strategies for the SCBA harness."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Callable, List, Sequence

from .measurements import Measurement
from .probes import Probe


@dataclass
class AttackResult:
    """Container for the collected observations of an attack."""

    secret: str
    samples: List[Measurement]


class Attack:
    """Base class for canned attacks."""

    name: str
    probe: Probe
    secrets: Sequence[str]
    samples_per_secret: int
    selector: Callable[[random.Random, int, str], str]

    def __init__(
        self,
        name: str,
        probe: Probe,
        secrets: Sequence[str],
        samples_per_secret: int,
        selector: Callable[[random.Random, int, str], str] | None = None,
    ) -> None:
        self.name = name
        self.probe = probe
        self.secrets = tuple(secrets)
        self.samples_per_secret = samples_per_secret
        self.selector = selector if selector else _default_selector

    def collect(self, rng: random.Random) -> List[AttackResult]:
        results: List[AttackResult] = []
        for idx, secret in enumerate(self.secrets):
            samples: List[Measurement] = []
            for sample_idx in range(self.samples_per_secret):
                chosen = self.selector(rng, sample_idx, secret)
                measurement = self.probe.invoke(chosen, rng)
                samples.append(measurement)
            results.append(AttackResult(secret=secret, samples=samples))
        return results


def _default_selector(_: random.Random, __: int, secret: str) -> str:
    return secret


@dataclass
class LengthLeakAttack(Attack):
    """Attack that differentiates secrets based on payload length."""

    def __init__(self, probe: Probe, secrets: Sequence[str] = ("0", "1"), samples_per_secret: int = 30):
        super().__init__("length-leak", probe, secrets, samples_per_secret)


@dataclass
class CacheWarmAttack(Attack):
    """Attack that inspects cache hint behaviour across requests."""

    warmup: int = 3
    history: List[float] = field(default_factory=list)

    def __init__(self, probe: Probe, secrets: Sequence[str] = ("cold", "warm"), samples_per_secret: int = 20, warmup: int = 3):
        super().__init__("cache-warm", probe, secrets, samples_per_secret)
        self.warmup = warmup

    def collect(self, rng: random.Random) -> List[AttackResult]:
        # warm the cache to create a baseline
        for _ in range(self.warmup):
            self.probe.invoke(self.secrets[0], rng)
        return super().collect(rng)


@dataclass
class CoarseTimerAttack(Attack):
    """Attack that focuses on coarse timing differences."""

    def __init__(self, probe: Probe, secrets: Sequence[str] = ("fast", "slow"), samples_per_secret: int = 40):
        super().__init__("coarse-timer", probe, secrets, samples_per_secret)
