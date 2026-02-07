from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from math import sqrt
from pathlib import Path
from typing import Any, Protocol

from summit.discover.objectives.entropic import entropic_objective, entropic_weights
from summit.discover.search.puct import NodeStats, select_with_puct


class Evaluator(Protocol):
    def evaluate(self, proposal: Any) -> float: ...


class ProposalGenerator(Protocol):
    def candidates(self, step: int, best_proposal: Any | None) -> list["Candidate"]: ...


@dataclass(frozen=True)
class Candidate:
    proposal: Any
    prior: float = 1.0


@dataclass(frozen=True)
class DiscoverConfig:
    seed: int
    max_steps: int
    max_cost_units: int
    output_root: Path
    artifact_root: Path
    feature_flag_ttt_discover: bool = False
    c_puct: float = 1.2
    entropic_beta: float = 1.0


def run_discover(
    cfg: DiscoverConfig,
    evaluator: Evaluator,
    generator: ProposalGenerator,
) -> dict[str, Any]:
    if not cfg.feature_flag_ttt_discover:
        raise RuntimeError("TTT-Discover runner is feature-flagged off")

    output_root = cfg.output_root
    artifact_root = cfg.artifact_root
    _assert_within_allowlist(output_root, artifact_root)

    config_hash = _config_hash(cfg)
    run_id = f"ttt-discover-{config_hash[:12]}"
    run_dir = output_root / run_id
    artifact_dir = run_dir / "artifact"
    run_dir.mkdir(parents=True, exist_ok=True)
    artifact_dir.mkdir(parents=True, exist_ok=True)

    stats: dict[Any, NodeStats] = {}
    rewards: list[float] = []
    best_history: list[float] = []
    best_reward = float("-inf")
    best_proposal: Any | None = None
    cost_units = 0
    status = "complete"

    for step in range(cfg.max_steps):
        if cost_units >= cfg.max_cost_units:
            status = "budget_exceeded"
            break
        candidates = generator.candidates(step, best_proposal)
        if not candidates:
            status = "no_candidates"
            break
        for candidate in candidates:
            stats.setdefault(candidate.proposal, NodeStats(prior=candidate.prior))
        selected = select_with_puct(
            [candidate.proposal for candidate in candidates],
            stats,
            c_puct=cfg.c_puct,
        )
        reward = evaluator.evaluate(selected)
        cost_units += 1
        rewards.append(reward)
        if reward > best_reward:
            best_reward = reward
            best_proposal = selected
        best_history.append(best_reward)

        node = stats[selected]
        node.visits += 1
        node.total_value += reward

    entropic_score = entropic_objective(rewards, cfg.entropic_beta) if rewards else 0.0
    entropic_wts = entropic_weights(rewards, cfg.entropic_beta)

    report = {
        "run_id": run_id,
        "status": status,
        "best_reward": best_reward,
        "best_proposal": best_proposal,
        "best_history": best_history,
        "rewards": rewards,
        "steps": len(rewards),
        "cost_units": cost_units,
        "config_hash": config_hash,
        "entropic_score": entropic_score,
    }
    metrics = {
        "run_id": run_id,
        "steps": len(rewards),
        "evaluations": len(rewards),
        "cost_units": cost_units,
        "best_reward": best_reward,
        "entropic_score": entropic_score,
        "entropic_weights": entropic_wts,
    }
    stamp = {
        "run_id": run_id,
        "git_sha": _git_sha(),
        "config_hash": config_hash,
    }

    _write_json(run_dir / "report.json", report)
    _write_json(run_dir / "metrics.json", metrics)
    _write_json(run_dir / "stamp.json", stamp)

    return report


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(
        _json_dumps(payload),
        encoding="utf-8",
    )


def _json_dumps(payload: dict[str, Any]) -> str:
    import json

    return json.dumps(payload, indent=2, sort_keys=True, ensure_ascii=False) + "\n"


def _config_hash(cfg: DiscoverConfig) -> str:
    payload = {
        "seed": cfg.seed,
        "max_steps": cfg.max_steps,
        "max_cost_units": cfg.max_cost_units,
        "c_puct": cfg.c_puct,
        "entropic_beta": cfg.entropic_beta,
        "feature_flag_ttt_discover": cfg.feature_flag_ttt_discover,
    }
    return sha256(_json_dumps(payload).encode("utf-8")).hexdigest()


def _assert_within_allowlist(output_root: Path, artifact_root: Path) -> None:
    output_root_resolved = output_root.resolve()
    artifact_root_resolved = artifact_root.resolve()
    if not output_root_resolved.is_relative_to(artifact_root_resolved):
        raise ValueError(
            "Output root must be within artifact allowlist root. "
            f"output_root={output_root_resolved} artifact_root={artifact_root_resolved}"
        )


def _git_sha() -> str:
    import subprocess

    try:
        return (
            subprocess.check_output(["git", "rev-parse", "HEAD"], text=True)
            .strip()
        )
    except (OSError, subprocess.CalledProcessError):
        return "unknown"
