from __future__ import annotations

from dataclasses import dataclass
from statistics import mean
from typing import Dict, List, Sequence

from .sampling import SampleResult
from .utils import Record, group_by


def population_stats(records: Sequence[Record], metric: str) -> Dict[str, float]:
    values = [record.metric(metric) for record in records]
    n = len(values)
    pop_mean = mean(values)
    sum_sq = sum((value - pop_mean) ** 2 for value in values)
    variance = sum_sq / (n - 1) if n > 1 else 0.0
    return {
        "count": n,
        "mean": pop_mean,
        "variance": variance,
    }


def sample_stats(result: SampleResult, metric: str) -> Dict[str, float]:
    values: List[float] = []
    for item in result.sampled:
        value = item.record.metric(metric)
        if item.draw_count > 1:
            values.extend([value] * item.draw_count)
        else:
            values.append(value)
    n = len(values)
    sample_mean = mean(values)
    sum_sq = sum((value - sample_mean) ** 2 for value in values)
    variance = sum_sq / (n - 1) if n > 1 else 0.0
    return {
        "count": n,
        "mean": sample_mean,
        "variance": variance,
    }


@dataclass
class Evaluation:
    plan_type: str
    proof: Dict[str, object]
    population: Dict[str, float]
    sample: Dict[str, float]
    expected_bias: float
    observed_bias: float
    expected_variance: float
    observed_variance: float


def evaluate(result: SampleResult, population: Sequence[Record], metric: str) -> Evaluation:
    pop_stats = population_stats(population, metric)
    sample_stats_result = sample_stats(result, metric)
    expected_bias, expected_variance = analytical_expectations(
        result, population, metric, pop_stats
    )
    observed_bias = sample_stats_result["mean"] - pop_stats["mean"]
    observed_variance = estimate_variance(
        result,
        population,
        metric,
        sample_stats_result,
    )
    return Evaluation(
        plan_type=result.plan_type,
        proof={
            "seed": result.seed,
            "rng_state_hash": result.proof().rng_state_hash,
            "inclusion_probabilities": result.proof().inclusion_probabilities,
        },
        population=pop_stats,
        sample=sample_stats_result,
        expected_bias=expected_bias,
        observed_bias=observed_bias,
        expected_variance=expected_variance,
        observed_variance=observed_variance,
    )


def estimate_variance(
    result: SampleResult,
    population: Sequence[Record],
    metric: str,
    sample_stats_result: Dict[str, float],
) -> float:
    metadata = result.metadata or {}
    n_population = len(population)
    if result.plan_type in {"uniform", "reservoir"}:
        n_sample = sample_stats_result["count"]
        if n_sample <= 1 or n_population <= 1:
            return 0.0
        f = n_sample / n_population
        return (1 - f) * sample_stats_result["variance"] / n_sample
    if result.plan_type == "stratified":
        strata_keys = metadata.get("strata_keys", [])
        strata_groups = group_by(population, strata_keys)
        sample_records = group_by([item.record for item in result.sampled], strata_keys)
        total = 0.0
        for key, population_records in strata_groups.items():
            Nh = len(population_records)
            if Nh <= 1:
                continue
            Wh = Nh / n_population
            sampled_records = sample_records.get(key, [])
            nh = len(sampled_records)
            if nh <= 1:
                continue
            sh2 = population_stats(sampled_records, metric)["variance"]
            total += (Wh**2) * ((1 - nh / Nh) * sh2 / nh)
        return total
    if result.plan_type == "pps":
        metadata_probs: Dict[int, float] = metadata.get("probabilities", {})  # type: ignore[arg-type]
        draws = max(1, int(metadata.get("draws", 1)))
        contributions: List[float] = []
        for item in result.sampled:
            base_prob = metadata_probs.get(item.record.index)
            if base_prob is None or base_prob == 0:
                continue
            contributions.extend([item.record.metric(metric) / base_prob] * item.draw_count)
        if not contributions:
            return 0.0
        estimator_mean = mean(contributions)
        variance = sum((value - estimator_mean) ** 2 for value in contributions) / (
            draws - 1 if draws > 1 else 1
        )
        variance /= draws
        return variance
    raise ValueError(f"Unsupported plan type for variance estimation: {result.plan_type}")


def analytical_expectations(
    result: SampleResult,
    population: Sequence[Record],
    metric: str,
    pop_stats: Dict[str, float],
) -> tuple[float, float]:
    n_population = len(population)
    metadata = result.metadata or {}
    if result.plan_type == "pps":
        n_sample = int(metadata.get("draws", 0))
    else:
        n_sample = int(metadata.get("sample_size", len(result.sampled)))
    if result.plan_type in {"uniform", "reservoir"}:
        expected_bias = 0.0
        if n_population <= 1 or n_sample == 0:
            expected_variance = 0.0
        else:
            expected_variance = (
                (1 - n_sample / n_population)
                * pop_stats["variance"]
                / n_sample
            )
        return expected_bias, expected_variance
    if result.plan_type == "stratified":
        expected_bias = 0.0
        strata_keys = metadata.get("strata_keys", [])
        strata_groups = group_by(population, strata_keys)
        strata_meta: Dict[str, Dict[str, int]] = metadata.get("strata", {})
        expected_variance = 0.0
        for key, records_in_stratum in strata_groups.items():
            Nh = len(records_in_stratum)
            if Nh <= 1:
                continue
            Wh = Nh / n_population
            Sh2 = population_stats(records_in_stratum, metric)["variance"]
            nh = int(strata_meta.get(key, {}).get("sample", 0))
            if nh <= 1:
                continue
            expected_variance += (Wh**2) * ((1 - nh / Nh) * Sh2 / nh)
        return expected_bias, expected_variance
    if result.plan_type == "pps":
        # Hansen-Hurwitz estimator variance
        probability_map: Dict[int, float] = metadata.get("probabilities", {})  # type: ignore[arg-type]
        draws = max(1, int(metadata.get("draws", 1)))
        contributions: List[float] = []
        for item in result.sampled:
            base_prob = probability_map.get(item.record.index)
            if base_prob is None or base_prob == 0:
                continue
            contributions.extend([item.record.metric(metric) / base_prob] * item.draw_count)
        if not contributions:
            return 0.0, 0.0
        estimator_mean = mean(contributions)
        expected_bias = 0.0
        variance = sum((value - estimator_mean) ** 2 for value in contributions) / (
            draws - 1 if draws > 1 else 1
        )
        variance /= draws
        return expected_bias, variance
    raise ValueError(f"Unsupported plan type for expectations: {result.plan_type}")
