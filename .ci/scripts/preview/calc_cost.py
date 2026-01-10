#!/usr/bin/env python3
"""Estimate preview environment cost and enforce budget guardrails.

Inputs
------
- values file (Helm values YAML)
- pricing and budget map (.maestro/ci_budget.json)
- ttl hours
- optional override flag

Outputs a JSON payload to stdout with `hourly_usd`, `ttl_hours`, `total_usd`,
`budget_usd`, and `breakdown`. Exits non-zero when the estimated total exceeds
budget and override is not permitted.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

try:
    import yaml
except Exception:  # pragma: no cover - dependency missing is actionable
    sys.stderr.write("PyYAML is required for calc_cost.py. Install with `pip install pyyaml`.\n")
    raise


def _load_yaml(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def _to_cores(value: str) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str) and value.endswith("m"):
        return float(value.rstrip("m")) / 1000.0
    return float(value)


def _to_gib(value: str) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    lower = str(value).lower()
    if lower.endswith("gi"):
        return float(lower.rstrip("gi"))
    if lower.endswith("g"):
        return float(lower.rstrip("g"))
    if lower.endswith("mi"):
        return float(lower.rstrip("mi")) / 1024.0
    raise ValueError(f"Unsupported memory unit for {value!r}")


def _calc_component_cost(component: dict[str, Any], pricing: dict[str, float]) -> dict[str, float]:
    replicas = int(component.get("replicas", 1))
    resources = component.get("requests", {})
    cpu = _to_cores(resources.get("cpu", "0"))
    mem = _to_gib(resources.get("memory", "0Gi"))

    cpu_cost = replicas * cpu * pricing["vcpu_hour"]
    mem_cost = replicas * mem * pricing["memory_gib_hour"]
    return {
        "cpu_vcpu_hr": cpu * replicas,
        "mem_gib_hr": mem * replicas,
        "cpu_usd_hr": cpu_cost,
        "mem_usd_hr": mem_cost,
        "replicas": replicas,
    }


def estimate(values: dict[str, Any], pricing: dict[str, float]) -> dict[str, Any]:
    components = values.get("components") or {}
    breakdown = {}
    hourly = 0.0

    for name, cfg in components.items():
        comp_cost = _calc_component_cost(cfg or {}, pricing)
        breakdown[name] = comp_cost
        hourly += comp_cost["cpu_usd_hr"] + comp_cost["mem_usd_hr"]

    storage_gib = float(values.get("storage", {}).get("pvc_gib", 0))
    lb_count = int(values.get("networking", {}).get("load_balancers", 0))

    storage_month = storage_gib * pricing.get("storage_gib_month", 0)
    # Convert monthly to hourly assuming 730 hours/mo.
    storage_hr = storage_month / 730 if storage_gib else 0
    lb_hr = lb_count * pricing.get("lb_hour", 0)

    breakdown["storage"] = {"pvc_gib": storage_gib, "usd_hr": storage_hr}
    breakdown["networking"] = {"load_balancers": lb_count, "usd_hr": lb_hr}

    hourly += storage_hr + lb_hr
    return {"hourly": round(hourly, 4), "breakdown": breakdown}


def enforce_budget(total_usd: float, budget_usd: float, override: bool) -> None:
    if total_usd <= budget_usd:
        return
    if override:
        sys.stderr.write(
            f"Budget override enabled. Estimated ${total_usd:.2f} exceeds budget ${budget_usd:.2f} but allowed.\n"
        )
        return
    raise SystemExit(
        f"Estimated preview cost ${total_usd:.2f} exceeds budget ${budget_usd:.2f}. Add `preview.budget.override=true` label and approval to continue."
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Preview environment cost calculator")
    parser.add_argument("values", type=Path, help="Path to Helm values used for preview")
    parser.add_argument("budget_map", type=Path, help="Path to budget JSON map")
    parser.add_argument("--ttl-hours", type=int, default=24, help="TTL hours applied to preview")
    parser.add_argument("--budget-override", action="store_true", help="Allow overrunning budget")
    args = parser.parse_args()

    values = _load_yaml(args.values)
    budget = json.loads(args.budget_map.read_text())

    preview_defaults = budget.get("preview_defaults", {})
    pricing = budget.get("preview_pricing", {})
    if not pricing:
        raise SystemExit("preview_pricing missing from budget map")

    estimate_data = estimate(values, pricing)
    hourly = estimate_data["hourly"]
    ttl_hours = args.ttl_hours
    total = round(hourly * ttl_hours, 4)

    # Budget scaling based on TTL (daily_usd applies per 24h).
    daily_budget = preview_defaults.get("daily_usd", 3.0)
    budget_usd = round(daily_budget * (ttl_hours / 24), 2)

    output = {
        "hourly_usd": hourly,
        "ttl_hours": ttl_hours,
        "total_usd": total,
        "budget_usd": budget_usd,
        "breakdown": estimate_data["breakdown"],
    }
    print(json.dumps(output, indent=2))

    enforce_budget(total, budget_usd, args.budget_override)


if __name__ == "__main__":
    main()
