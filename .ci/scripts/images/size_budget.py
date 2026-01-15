#!/usr/bin/env python3
"""Enforce runtime image size budgets and emit trend metadata.

The script expects a JSON payload describing measured image sizes in MB. Input formats:
- Mapping: {"api-gateway": 145.2, "ml-engine": 210.0}
- List of objects: [{"name": "api-gateway", "size_mb": 145.2}]

Example:
  python .ci/scripts/images/size_budget.py --sizes sizes.json --budgets .maestro/ci_budget.json \
    --trend-output artifacts/image-size-trend.json
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path


def load_sizes(path: Path) -> dict[str, float]:
    raw = json.loads(path.read_text())
    if isinstance(raw, dict):
        return {str(k): float(v) for k, v in raw.items()}
    if isinstance(raw, list):
        sizes: dict[str, float] = {}
        for entry in raw:
            name = entry.get("name") or entry.get("image")
            size = entry.get("size_mb") or entry.get("size")
            if name is None or size is None:
                continue
            sizes[str(name)] = float(size)
        return sizes
    raise ValueError("Unrecognized size payload; expected map or list")


def load_budgets(path: Path) -> dict[str, float]:
    data = json.loads(path.read_text())
    return data.get("max_runtime_image_mb", {})


def validate(sizes: dict[str, float], budgets: dict[str, float]) -> list[str]:
    violations: list[str] = []
    for name, size in sizes.items():
        budget = budgets.get(name) or budgets.get("default")
        if budget is None:
            continue
        if size > float(budget):
            violations.append(f"{name} is {size:.1f}MB (budget {float(budget):.1f}MB)")
    return violations


def persist_trend(output: Path, sizes: dict[str, float]):
    output.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "images": sizes,
    }
    output.write_text(json.dumps(payload, indent=2))


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Enforce container image size budgets")
    parser.add_argument("--sizes", type=Path, help="JSON file with image size measurements")
    parser.add_argument("--budgets", type=Path, default=Path(".maestro/ci_budget.json"))
    parser.add_argument(
        "--trend-output", type=Path, default=Path("artifacts/image-size-trend.json")
    )
    parser.add_argument(
        "--allow-empty", action="store_true", help="Do not fail when size data is missing"
    )

    args = parser.parse_args(argv)

    if not args.sizes or not args.sizes.exists():
        msg = "size payload not provided; skipping enforcement"
        if args.allow_empty:
            print(msg)
            return 0
        parser.error(msg)

    sizes = load_sizes(args.sizes)
    if not sizes:
        print("no images reported; nothing to check")
        return 0

    budgets = load_budgets(args.budgets)
    violations = validate(sizes, budgets)

    persist_trend(args.trend_output, sizes)

    if violations:
        for v in violations:
            print(f"BUDGET VIOLATION: {v}")
        return 1

    print("All image sizes within budget")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
