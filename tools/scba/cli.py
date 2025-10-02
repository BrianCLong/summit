"""Command line interface for the Side-Channel Budget Auditor."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict

from .attacks import CacheWarmAttack, CoarseTimerAttack, LengthLeakAttack
from .policies import EndpointPolicy, LeakBudget, PolicyStore
from .probes import HttpProbe
from .runner import SideChannelBudgetAuditor


def load_policy(path: Path) -> PolicyStore:
    data = json.loads(path.read_text())
    store = PolicyStore()
    for endpoint, cfg in data.items():
        budget_cfg = cfg.get("budget", {})
        policy = EndpointPolicy(
            endpoint=endpoint,
            budget=LeakBudget(
                latency_ms=budget_cfg.get("latency_ms", 5.0),
                payload_bytes=budget_cfg.get("payload_bytes", 32.0),
                cache_hint=budget_cfg.get("cache_hint", 0.5),
            ),
            mitigation_toggles=cfg.get("mitigations"),
        )
        store.register(policy)
    return store


def build_cli(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Side-Channel Budget Auditor")
    parser.add_argument("policy", type=Path, help="Path to the leak budget policy JSON file")
    parser.add_argument("endpoint", type=str, help="Endpoint identifier defined in the policy")
    parser.add_argument("url", type=str, help="URL to probe")
    parser.add_argument("--method", default="GET", help="HTTP method to use")
    parser.add_argument("--seed", type=int, default=0, help="Random seed for reproducibility")
    parser.add_argument("--attack", choices=["length", "timer", "cache"], default="length")
    parser.add_argument("--samples", type=int, default=30, help="Samples per secret")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = build_cli(argv)
    policy_store = load_policy(args.policy)
    auditor = SideChannelBudgetAuditor(policy_store, seed=args.seed)
    probe = HttpProbe(method=args.method, url=args.url)
    if args.attack == "length":
        attack = LengthLeakAttack(probe, samples_per_secret=args.samples)
    elif args.attack == "timer":
        attack = CoarseTimerAttack(probe, samples_per_secret=args.samples)
    else:
        attack = CacheWarmAttack(probe, samples_per_secret=args.samples)
    auditor.register_attack(args.endpoint, attack)
    findings = auditor.run()
    print(SideChannelBudgetAuditor.summarize(findings))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
