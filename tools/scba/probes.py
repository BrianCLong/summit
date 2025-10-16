"""Probe implementations used by the SCBA harness."""

from __future__ import annotations

import random
import time
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from typing import Protocol

import requests

from .measurements import Measurement


class Probe(Protocol):
    """A probe collects measurements for a given secret or scenario."""

    def invoke(self, secret: str, rng: random.Random) -> Measurement: ...


@dataclass
class HttpProbe:
    """Probe that issues HTTP requests against a configurable endpoint.

    The probe allows callers to control headers, query strings and payloads via
    a *builder* function. The builder receives the randomly chosen secret value
    and the RNG instance so that experiments can remain deterministic.
    """

    method: str
    url: str
    build_request: Callable[[str, random.Random], dict] | None = None
    session_factory: Callable[[], requests.Session] | None = None
    timeout: float | None = 5.0

    def invoke(self, secret: str, rng: random.Random) -> Measurement:
        session = self.session_factory() if self.session_factory else requests.Session()
        try:
            request_kwargs = self.build_request(secret, rng) if self.build_request else {}
            start = time.perf_counter()
            response = session.request(
                self.method, self.url, timeout=self.timeout, **request_kwargs
            )
            elapsed_ms = (time.perf_counter() - start) * 1000.0
            cache_header = response.headers.get("X-Cache", "0")
            cache_hint = 1.0 if cache_header.lower().startswith("hit") else 0.0
            return Measurement(
                latency_ms=elapsed_ms,
                payload_bytes=len(response.content),
                cache_hint=cache_hint,
                meta={"status_code": float(response.status_code)},
            )
        finally:
            session.close()


@dataclass
class SyntheticProbe:
    """Probe backed by a deterministic callable for tests and local services."""

    fn: Callable[[str, random.Random], Measurement]

    def invoke(self, secret: str, rng: random.Random) -> Measurement:
        return self.fn(secret, rng)


def cycle_secrets(secrets: Iterable[str]) -> Callable[[random.Random, int, str], str]:
    """Return a helper that cycles through a fixed set of secrets.

    The resulting callable accepts ``(rng, idx)`` and returns the secret to use
    for a given sample index. It preserves reproducibility by ignoring the RNG
    when a deterministic ordering is required.
    """

    secrets = tuple(secrets)

    def _select(_: random.Random, idx: int, __: str) -> str:
        return secrets[idx % len(secrets)]

    return _select
