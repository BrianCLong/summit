"""Measurement primitives for the Side-Channel Budget Auditor."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Measurement:
    """Represents a single observation for an API invocation.

    Attributes
    ----------
    latency_ms:
        Wall clock latency in milliseconds.
    payload_bytes:
        Size of the response payload in bytes.
    cache_hint:
        Numeric representation of cache hint behaviour. This is a float so
        that higher-order statistics (e.g. hit ratios) can be captured. The
        default HTTP probe maps cache headers to this channel, while synthetic
        probes may use domain-specific semantics.
    meta:
        Optional structured metadata attached to the observation. Metadata is
        ignored by default but can be surfaced in reports.
    """

    latency_ms: float
    payload_bytes: int
    cache_hint: float
    meta: dict[str, float] | None = None

    def channel(self, name: str) -> float:
        """Return a measurement channel by name."""

        if name == "latency_ms":
            return self.latency_ms
        if name == "payload_bytes":
            return float(self.payload_bytes)
        if name == "cache_hint":
            return self.cache_hint
        raise KeyError(f"unknown measurement channel: {name}")
