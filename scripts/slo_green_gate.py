#!/usr/bin/env python3
"""Post-deploy validation gate that asserts IntelGraph SLOs are green."""

from __future__ import annotations

import argparse
import sys
import urllib.parse
import urllib.request
import json
from typing import Tuple

DEFAULT_URL = "http://localhost:9090"

CHECKS: Tuple[Tuple[str, str, float], ...] = (
    ("Gateway error ratio", "gateway:slo_error_ratio_5m", 0.001),
    ("Gateway unit cost", "gateway:unit_cost_per_million", 80.0),
    ("Connectors error ratio", "connectors:slo_error_ratio_5m", 0.005),
    ("Connectors unit cost", "connectors:unit_cost_per_thousand", 0.8),
)


def _query(prometheus_url: str, query: str) -> float:
    params = urllib.parse.urlencode({"query": query})
    url = f"{prometheus_url.rstrip('/')}/api/v1/query?{params}"
    with urllib.request.urlopen(url, timeout=10) as response:  # noqa: S310 - URL constructed from trusted input
        payload = json.loads(response.read().decode("utf-8"))
    if payload.get("status") != "success":  # pragma: no cover - defensive
        raise RuntimeError(f"Prometheus query failed: {payload}")
    result = payload.get("data", {}).get("result", [])
    if not result:
        return 0.0
    value = result[0].get("value")
    if not value or len(value) < 2:
        return 0.0
    try:
        return float(value[1])
    except (TypeError, ValueError):  # pragma: no cover - defensive
        return 0.0


def run_checks(prometheus_url: str) -> int:
    failures: list[str] = []
    for label, query, threshold in CHECKS:
        observed = _query(prometheus_url, query)
        if observed > threshold:
            failures.append(f"{label} at {observed:.4f} exceeds threshold {threshold}")
    if failures:
        for failure in failures:
            print(f"[FAIL] {failure}")
        return 1
    print("All SLO guardrails are green.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate SLOs before promotion")
    parser.add_argument("--prometheus-url", default=DEFAULT_URL, help="Base URL for Prometheus API")
    args = parser.parse_args()
    return run_checks(args.prometheus_url)


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    sys.exit(main())
