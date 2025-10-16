#!/usr/bin/env python3
"""
Offline evaluator runner

Reads JSONL logs of routed decisions and computes IPS/DR estimates overall and by group.

Input JSONL schema (per line):
  {
    "policy_prob": float,
    "logging_prob": float,
    "reward": float,
    "q_hat": float,
    "v_hat": float,
    "expert": "graph_ops" | "rag_retrieval" | "osint_analysis" | string,
    "tenant_tier": "gold" | "silver" | "bronze" | string
  }

Usage:
  python services/analytics/simulator/offline_eval.py --log runs/offline-replay.jsonl --out reports
"""

from __future__ import annotations

import argparse
import json
import time
from collections import defaultdict
from pathlib import Path
from typing import Any

import numpy as np

# Local evaluator util
try:
    from services.analytics.eval.dr_eval import doubly_robust
except Exception:
    # Fallback for direct invocation from repo root
    from services.analytics.eval.dr_eval import doubly_robust  # type: ignore


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    return rows


def eval_group(rows: list[dict[str, Any]]) -> dict[str, float]:
    policy_probs = np.array([r["policy_prob"] for r in rows], dtype=float)
    logging_probs = np.array([r["logging_prob"] for r in rows], dtype=float)
    rewards = np.array([r["reward"] for r in rows], dtype=float)
    q_hat = np.array([r.get("q_hat", 0.0) for r in rows], dtype=float)
    v_hat = float(np.mean([r.get("v_hat", 0.0) for r in rows]) if rows else 0.0)
    return doubly_robust(policy_probs, logging_probs, rewards, q_hat, v_hat)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--log", required=True, help="Path to JSONL replay file")
    ap.add_argument("--out", default="reports", help="Output directory for summaries")
    args = ap.parse_args()

    log_path = Path(args.log)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    rows = load_jsonl(log_path)
    if not rows:
        raise SystemExit(f"No rows found in {log_path}")

    # Overall
    overall = eval_group(rows)

    # By expert and tenant tier
    by_expert: dict[str, list[dict[str, Any]]] = defaultdict(list)
    by_tier: dict[str, list[dict[str, Any]]] = defaultdict(list)
    by_combo: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for r in rows:
        ex = r.get("expert", "unknown")
        tr = r.get("tenant_tier", "unknown")
        by_expert[ex].append(r)
        by_tier[tr].append(r)
        by_combo[f"{ex}:{tr}"].append(r)

    summary = {
        "overall": overall,
        "by_expert": {k: eval_group(v) for k, v in by_expert.items()},
        "by_tier": {k: eval_group(v) for k, v in by_tier.items()},
        "by_expert_tier": {k: eval_group(v) for k, v in by_combo.items()},
        "counts": {
            "total": len(rows),
            "experts": {k: len(v) for k, v in by_expert.items()},
            "tiers": {k: len(v) for k, v in by_tier.items()},
        },
    }

    ts = time.strftime("%Y%m%d-%H%M%S")
    out_json = out_dir / f"offline-eval-{ts}.json"
    out_csv = out_dir / f"offline-eval-{ts}.csv"

    with out_json.open("w") as f:
        json.dump(summary, f, indent=2)

    # Flatten to CSV rows
    def rowify(scope: str, name: str, m: dict[str, float]):
        return {
            "scope": scope,
            "name": name,
            **m,
        }

    csv_rows: list[dict[str, Any]] = [rowify("overall", "all", overall)]
    csv_rows += [rowify("expert", k, v) for k, v in summary["by_expert"].items()]
    csv_rows += [rowify("tier", k, v) for k, v in summary["by_tier"].items()]
    csv_rows += [rowify("expert_tier", k, v) for k, v in summary["by_expert_tier"].items()]

    # Write CSV
    import csv

    fieldnames = [
        "scope",
        "name",
        "ips_mean",
        "dr_mean",
        "ips_ci95",
        "dr_ci95",
    ]
    with out_csv.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in csv_rows:
            w.writerow(r)

    print(f"Wrote {out_json} and {out_csv}")


if __name__ == "__main__":
    main()
