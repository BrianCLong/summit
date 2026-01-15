from __future__ import annotations

import importlib.util
from collections.abc import Iterable
from pathlib import Path

from .runner import RobustnessRun


def _matplotlib():
    spec = importlib.util.find_spec("matplotlib")
    if spec is None:
        raise RuntimeError("matplotlib is required to export Pareto plots")
    import matplotlib.pyplot as plt  # type: ignore

    return plt


def _pareto_front(runs: Iterable[RobustnessRun]) -> list[RobustnessRun]:
    frontier: list[RobustnessRun] = []
    for candidate in runs:
        dominated = False
        for other in runs:
            if other is candidate:
                continue
            if (
                other.quality_mean >= candidate.quality_mean
                and other.p95_latency_ms <= candidate.p95_latency_ms
                and other.cost_total_usd <= candidate.cost_total_usd
                and (
                    other.quality_mean > candidate.quality_mean
                    or other.p95_latency_ms < candidate.p95_latency_ms
                    or other.cost_total_usd < candidate.cost_total_usd
                )
            ):
                dominated = True
                break
        if not dominated:
            frontier.append(candidate)
    return frontier


def export_pareto_frontier(runs: Iterable[RobustnessRun], output_path: Path) -> None:
    runs_list = list(runs)
    plt = _matplotlib()
    frontier = _pareto_front(runs_list)
    fig, ax = plt.subplots(figsize=(8, 6))

    for run in runs_list:
        ax.scatter(
            run.p95_latency_ms,
            run.cost_total_usd,
            s=120 * run.quality_mean,
            alpha=0.6,
            label=run.ablation.name,
            edgecolors="black" if run in frontier else "none",
        )

    ax.set_xlabel("p95 latency (ms)")
    ax.set_ylabel("cost (USD)")
    ax.set_title("Quality/Latency/Cost Pareto Frontier")
    handles, labels = ax.get_legend_handles_labels()
    # Avoid duplicate labels
    unique = dict(zip(labels, handles))
    ax.legend(unique.values(), unique.keys(), fontsize="small", frameon=False)
    ax.grid(True, linestyle="--", alpha=0.4)
    fig.tight_layout()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_path)
    plt.close(fig)
