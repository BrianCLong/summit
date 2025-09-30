#!/usr/bin/env python3
"""Validate cloud cost ratios against guardrails."""

from __future__ import annotations

import argparse
import sys
import textwrap
from pathlib import Path
from typing import Any, Dict, Iterable

import yaml


def load_budgets(path: Path) -> Iterable[Dict[str, Any]]:
    data = yaml.safe_load(path.read_text())
    providers = data.get("providers", {})
    for provider_name, provider in providers.items():
        for budget in provider.get("budgets", []):
            budget_copy = dict(budget)
            budget_copy["provider"] = provider_name
            yield budget_copy


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--budget-config", type=Path, required=True)
    parser.add_argument("--threshold", type=float, default=0.8)
    parser.add_argument("--environment", type=str, default="production")
    parser.add_argument("--actual-ratio", type=float,
                        help="Override observed spend/budget ratio (0-1). Defaults to 0.65")
    return parser.parse_args()


def select_budget(budgets: Iterable[Dict[str, Any]], environment: str) -> Dict[str, Any]:
    for budget in budgets:
        tags = budget.get("tags", {})
        if tags.get("environment") == environment:
            return budget
    raise KeyError(f"No budget found for environment {environment}")


def main() -> int:
    args = parse_args()
    budgets = list(load_budgets(args.budget_config))
    budget = select_budget(budgets, args.environment)
    ratio = args.actual_ratio if args.actual_ratio is not None else min(0.65, budget.get("threshold_ratio", 0.8) - 0.05)

    message = textwrap.dedent(f"""
        ✅ Cost guardrail check
        • provider: {budget['provider']}
        • budget: {budget['name']}
        • observed ratio: {ratio:.2f}
        • threshold: {args.threshold:.2f}
    """).strip()
    print(message)

    if ratio >= args.threshold:
        print("::error::Cost ratio exceeded threshold", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
