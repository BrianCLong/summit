from __future__ import annotations

import json
import random
from collections.abc import Iterable
from dataclasses import dataclass
from itertools import product
from pathlib import Path
from statistics import quantiles

import yaml

from .inputs import ROBUSTNESS_INPUTS, RobustnessInput
from .perturbations import PERTURBATIONS, Perturbation
from .plotting import export_pareto_frontier


@dataclass
class AblationSetting:
    name: str
    component: dict[str, str]
    data: dict[str, str]
    compute: dict[str, str]


@dataclass
class CaseResult:
    input_slug: str
    perturbation: str
    quality: float
    latency_ms: float
    cost_usd: float


@dataclass
class RobustnessRun:
    ablation: AblationSetting
    results: list[CaseResult]

    @property
    def quality_mean(self) -> float:
        return sum(case.quality for case in self.results) / len(self.results)

    @property
    def p95_latency_ms(self) -> float:
        percentiles = quantiles([case.latency_ms for case in self.results], n=20)
        return percentiles[18]

    @property
    def cost_total_usd(self) -> float:
        return sum(case.cost_usd for case in self.results)

    def to_summary(self) -> dict[str, object]:
        return {
            "ablation": self.ablation.name,
            "quality_mean": round(self.quality_mean, 4),
            "p95_latency_ms": round(self.p95_latency_ms, 2),
            "cost_total_usd": round(self.cost_total_usd, 4),
        }


def _load_yaml_options(path: Path, key: str) -> list[dict[str, str]]:
    raw = yaml.safe_load(path.read_text()) or {}
    entries = raw.get(key, [])
    if not isinstance(entries, list):
        raise ValueError(f"Expected list under '{key}' in {path}")
    return entries


def load_ablation_grid(config_root: Path) -> list[AblationSetting]:
    components = _load_yaml_options(config_root / "components.yaml", "components")
    data = _load_yaml_options(config_root / "data.yaml", "data")
    compute = _load_yaml_options(config_root / "compute.yaml", "compute")

    grid: list[AblationSetting] = []
    for comp, datum, compu in product(components, data, compute):
        name = "|".join(
            [comp.get("name", "comp"), datum.get("name", "data"), compu.get("name", "compute")]
        )
        grid.append(
            AblationSetting(
                name=name,
                component=comp,
                data=datum,
                compute=compu,
            )
        )
    return grid


def _score_quality(base: float, perturbation: Perturbation, ablation: AblationSetting) -> float:
    penalty = {
        "noisy-channel": 0.04,
        "locale-drift": 0.06,
        "reverse-order": 0.03,
        "unit-drop": 0.02,
        "edge-pressure": 0.08,
    }.get(perturbation.name, 0.01)
    guardrail_bonus = 0.03 if ablation.component.get("guardrail", "balanced") == "strict" else 0.0
    data_bonus = 0.02 if ablation.data.get("augmentation", "off") == "on" else 0.0
    return max(0.0, min(1.0, base - penalty + guardrail_bonus + data_bonus))


def _estimate_latency(prompt: str, perturbation: Perturbation, ablation: AblationSetting) -> float:
    base = 120 + len(prompt) * 0.15
    multiplier = 0.9 if ablation.compute.get("tier", "m") == "l" else 1.0
    multiplier = 1.1 if ablation.compute.get("tier", "m") == "s" else multiplier
    noise = 10.0 * (1 + 0.25 * len(prompt.split(";")))
    perturbation_cost = {
        "noisy-channel": 18.0,
        "locale-drift": 22.0,
        "reverse-order": 9.0,
        "unit-drop": 6.0,
        "edge-pressure": 25.0,
    }.get(perturbation.name, 12.0)
    return (base + perturbation_cost + noise) * multiplier


def _estimate_cost(prompt: str, perturbation: Perturbation, ablation: AblationSetting) -> float:
    token_estimate = len(prompt.split()) + 6 * len(perturbation.name)
    price_per_k = float(ablation.compute.get("usd_per_1k_tokens", 0.003))
    return price_per_k * token_estimate / 1000.0


def _evaluate_case(
    rng: random.Random,
    robustness_input: RobustnessInput,
    perturbation: Perturbation,
    ablation: AblationSetting,
) -> CaseResult:
    quality_base = 0.82 + 0.05 * rng.random()
    quality = _score_quality(quality_base, perturbation, ablation)
    latency_ms = _estimate_latency(robustness_input.prompt, perturbation, ablation)
    jitter = rng.random() * 8.0
    latency_ms = latency_ms + jitter
    cost_usd = _estimate_cost(robustness_input.prompt, perturbation, ablation)
    return CaseResult(
        input_slug=robustness_input.slug,
        perturbation=perturbation.name,
        quality=quality,
        latency_ms=latency_ms,
        cost_usd=cost_usd,
    )


def _materialize_cases(ablation: AblationSetting) -> Iterable[CaseResult]:
    rng = random.Random(hash(ablation.name) & 0xFFFFFFFF)
    for robustness_input in ROBUSTNESS_INPUTS:
        for perturbation in PERTURBATIONS:
            yield _evaluate_case(rng, robustness_input, perturbation, ablation)


def evaluate_suite(
    output_dir: Path | str | None = None, config_dir: Path | str | None = None
) -> list[RobustnessRun]:
    config_root = Path(config_dir) if config_dir else Path("bench/configs/ablations")
    ablations = load_ablation_grid(config_root)
    runs: list[RobustnessRun] = []
    output_base = Path(output_dir) if output_dir else Path("bench/robustness/output")
    output_base.mkdir(parents=True, exist_ok=True)

    summaries: list[dict[str, object]] = []
    for ablation in ablations:
        results = list(_materialize_cases(ablation))
        run = RobustnessRun(ablation=ablation, results=results)
        runs.append(run)
        run_path = output_base / f"run_{ablation.name.replace('|', '_')}.json"
        run_path.write_text(
            json.dumps(
                {"ablation": ablation.name, "cases": [case.__dict__ for case in results]}, indent=2
            )
        )
        summaries.append(run.to_summary())

    summary_path = output_base / "summary.json"
    summary_path.write_text(json.dumps({"runs": summaries}, indent=2))
    export_pareto_frontier(runs, output_base / "pareto_frontier.png")
    return runs


def _demo() -> None:
    runs = evaluate_suite()
    for run in runs:
        print(run.to_summary())


if __name__ == "__main__":
    _demo()
