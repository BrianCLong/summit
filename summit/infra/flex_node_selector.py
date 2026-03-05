from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

from .instance_catalog import InstanceCandidate, normalize_cost


@dataclass(frozen=True)
class SelectionInput:
    """Configurable selector inputs; deterministic by construction."""

    allowed_families: tuple[str, ...]
    worker_count: int
    provider: str
    workload: str
    weight_cost: float = 0.35
    weight_performance: float = 0.40
    weight_availability: float = 0.25


class FlexNodeSelector:
    def __init__(self, selection_input: SelectionInput):
        self.selection_input = selection_input

    def select(self, catalog: list[InstanceCandidate]) -> dict:
        if self.selection_input.worker_count <= 0:
            raise ValueError("worker_count must be positive")

        allowed = set(self.selection_input.allowed_families)
        scoped = [
            c
            for c in catalog
            if c.provider == self.selection_input.provider and c.family in allowed
        ]
        if not scoped:
            raise ValueError("No instance candidates match provider/family policy")

        max_cost = max(c.hourly_cost_usd for c in scoped)
        scored: list[dict] = []
        for candidate in scoped:
            cost_score = normalize_cost(candidate.hourly_cost_usd, max_cost)
            weighted = (
                self.selection_input.weight_cost * cost_score
                + self.selection_input.weight_performance * candidate.performance_score
                + self.selection_input.weight_availability * candidate.availability_score
            )
            scored.append(
                {
                    "provider": candidate.provider,
                    "instance_type": candidate.instance_type,
                    "family": candidate.family,
                    "hourly_cost_usd": round(candidate.hourly_cost_usd, 6),
                    "availability_score": round(candidate.availability_score, 6),
                    "performance_score": round(candidate.performance_score, 6),
                    "cost_score": round(cost_score, 6),
                    "weighted_score": round(weighted, 6),
                }
            )

        scored.sort(
            key=lambda item: (
                -item["weighted_score"],
                item["hourly_cost_usd"],
                item["instance_type"],
            )
        )

        selected = scored[0]
        payload = {
            "selector": "flex_node_selector",
            "policy": {
                "allowed_families": sorted(list(allowed)),
                "deny_by_default": True,
            },
            "request": {
                "provider": self.selection_input.provider,
                "worker_count": self.selection_input.worker_count,
                "workload": self.selection_input.workload,
            },
            "selected": selected,
            "ranked_candidates": scored,
        }
        evidence_hash = hashlib.sha256(
            json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
        ).hexdigest()[:12]
        payload["evidence_id"] = f"SUMMIT-FLEXNODE-{evidence_hash}"
        return payload


def select_flexible_node(
    selection_input: SelectionInput,
    catalog: list[InstanceCandidate],
    output_dir: Path,
    git_sha: str,
) -> dict:
    """Generate deterministic artifacts for CI and audit usage."""

    output_dir.mkdir(parents=True, exist_ok=True)
    report = FlexNodeSelector(selection_input).select(catalog)

    metrics = {
        "selector": "flex_node_selector",
        "runtime_ms_budget": 50,
        "ci_runtime_budget_s": 30,
        "memory_budget_mb": 50,
        "candidate_count": len(report["ranked_candidates"]),
        "top_weighted_score": report["selected"]["weighted_score"],
        "evidence_id": report["evidence_id"],
    }
    stamp = {
        "selector": "flex_node_selector",
        "git_sha": git_sha,
        "evidence_id": report["evidence_id"],
    }

    (output_dir / "selection_report.json").write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    (output_dir / "metrics.json").write_text(
        json.dumps(metrics, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    (output_dir / "stamp.json").write_text(
        json.dumps(stamp, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    return report
