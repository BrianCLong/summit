"""Configuration objects for MFUE."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ReproducibilityConfig:
    """Configuration specifying seeds for deterministic behaviour.

    Attributes
    ----------
    seed: int
        Global seed applied to numpy's RNG and any local shuffles. By keeping
        this configuration immutable we can share it safely between evaluation
        components.
    bootstrap_samples: int
        Number of bootstrap samples used when estimating statistical
        significance. Defaults to 1_000 which provides tight confidence bounds
        for small datasets while remaining computationally light.
    """

    seed: int = 42
    bootstrap_samples: int = 1_000


DEFAULT_CONFIG = ReproducibilityConfig()
"""Default configuration used when no overrides are provided."""
