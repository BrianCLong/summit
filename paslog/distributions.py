"""Distribution primitives used by PASLOG."""

from __future__ import annotations

import datetime as _dt
import random
import string
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Callable, List, Optional, Sequence, Tuple, TypeVar

T = TypeVar("T")


class DistributionSpec(ABC):
    """Abstract distribution interface."""

    @abstractmethod
    def sample(self, rng: random.Random) -> T:
        """Return a single sampled value."""

    def sample_many(self, rng: random.Random, count: int) -> List[T]:
        return [self.sample(rng) for _ in range(count)]


@dataclass(frozen=True)
class ChoiceDistribution(DistributionSpec):
    """Select from a bounded set of values optionally weighted."""

    values: Sequence[T]
    weights: Optional[Sequence[float]] = None

    def __post_init__(self) -> None:
        if not self.values:
            raise ValueError("ChoiceDistribution requires at least one value")
        if self.weights is not None and len(self.weights) != len(self.values):
            raise ValueError("weights must be the same length as values")

    def sample(self, rng: random.Random) -> T:  # type: ignore[override]
        if self.weights is None:
            return rng.choice(list(self.values))
        return rng.choices(list(self.values), weights=list(self.weights), k=1)[0]


@dataclass(frozen=True)
class UniformIntDistribution(DistributionSpec):
    low: int
    high: int

    def __post_init__(self) -> None:
        if self.low > self.high:
            raise ValueError("low must be less than or equal to high")

    def sample(self, rng: random.Random) -> int:  # type: ignore[override]
        return rng.randint(self.low, self.high)


@dataclass(frozen=True)
class UniformFloatDistribution(DistributionSpec):
    low: float
    high: float
    precision: int = 3

    def __post_init__(self) -> None:
        if self.low > self.high:
            raise ValueError("low must be less than or equal to high")
        if self.precision < 0:
            raise ValueError("precision must be non-negative")

    def sample(self, rng: random.Random) -> float:  # type: ignore[override]
        value = rng.uniform(self.low, self.high)
        return round(value, self.precision)


@dataclass(frozen=True)
class NormalDistribution(DistributionSpec):
    mean: float
    stddev: float
    precision: int = 3
    bounds: Optional[Tuple[float, float]] = None

    def __post_init__(self) -> None:
        if self.stddev <= 0:
            raise ValueError("stddev must be positive")
        if self.precision < 0:
            raise ValueError("precision must be non-negative")
        if self.bounds is not None and self.bounds[0] > self.bounds[1]:
            raise ValueError("Invalid bounds: low must be <= high")

    def sample(self, rng: random.Random) -> float:  # type: ignore[override]
        value = rng.gauss(self.mean, self.stddev)
        if self.bounds is not None:
            low, high = self.bounds
            value = min(max(value, low), high)
        return round(value, self.precision)


@dataclass(frozen=True)
class TimestampDistribution(DistributionSpec):
    start: _dt.datetime
    end: _dt.datetime
    fmt: str = "%Y-%m-%dT%H:%M:%S.%fZ"

    def __post_init__(self) -> None:
        if self.start > self.end:
            raise ValueError("start must be before end")

    def sample(self, rng: random.Random) -> str:  # type: ignore[override]
        delta = self.end - self.start
        seconds = rng.uniform(0, delta.total_seconds())
        ts = self.start + _dt.timedelta(seconds=seconds)
        return ts.strftime(self.fmt)


@dataclass(frozen=True)
class CallableDistribution(DistributionSpec):
    func: Callable[[random.Random], T]

    def sample(self, rng: random.Random) -> T:  # type: ignore[override]
        return self.func(rng)


@dataclass(frozen=True)
class RandomHexDistribution(DistributionSpec):
    length: int = 12
    prefix: str = ""

    alphabet: Sequence[str] = field(default_factory=lambda: string.hexdigits.lower())

    def __post_init__(self) -> None:
        if self.length <= 0:
            raise ValueError("length must be positive")

    def sample(self, rng: random.Random) -> str:  # type: ignore[override]
        value = "".join(rng.choice(self.alphabet) for _ in range(self.length))
        return f"{self.prefix}{value}"
