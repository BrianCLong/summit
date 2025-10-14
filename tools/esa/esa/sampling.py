from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple

from .utils import Record, SamplingProof, group_by, hash_rng_state


@dataclass
class SampledRecord:
    record: Record
    inclusion_probability: float
    draw_count: int = 1


@dataclass
class SampleResult:
    plan_type: str
    seed: int
    rng_state: Tuple
    sampled: List[SampledRecord]
    metadata: Dict[str, object] | None = None

    def proof(self) -> SamplingProof:
        return SamplingProof(
            seed=self.seed,
            rng_state_hash=hash_rng_state(self.rng_state),
            inclusion_probabilities={
                item.record.index: item.inclusion_probability for item in self.sampled
            },
        )


class SamplingPlan:
    plan_type: str

    def __init__(self, seed: Optional[int] = None) -> None:
        self.seed = seed if seed is not None else random.randrange(0, 2**32 - 1)

    def random(self) -> random.Random:
        return random.Random(self.seed)

    def execute(self, records: Sequence[Record]) -> SampleResult:
        raise NotImplementedError

    @staticmethod
    def from_config(config: Dict) -> "SamplingPlan":
        plan_type = config.get("type")
        if not plan_type:
            raise ValueError("Sampling plan must specify a 'type'")
        seed = config.get("seed")
        if plan_type == "uniform":
            return UniformSamplingPlan(
                sample_size=config.get("sample_size"),
                fraction=config.get("fraction"),
                seed=seed,
            )
        if plan_type == "stratified":
            return StratifiedSamplingPlan(
                sample_size=config.get("sample_size"),
                strata=config.get("strata", []),
                allocations=config.get("allocations"),
                seed=seed,
            )
        if plan_type == "pps":
            weight_column = config.get("weight_column")
            if not weight_column:
                raise ValueError("PPS plan requires a 'weight_column'")
            return PPSSamplingPlan(
                sample_size=config.get("sample_size"),
                weight_column=weight_column,
                seed=seed,
            )
        if plan_type == "reservoir":
            return ReservoirSamplingPlan(sample_size=config.get("sample_size"), seed=seed)
        raise ValueError(f"Unsupported sampling plan type: {plan_type}")


class UniformSamplingPlan(SamplingPlan):
    plan_type = "uniform"

    def __init__(self, sample_size: Optional[int], fraction: Optional[float], seed: Optional[int]) -> None:
        super().__init__(seed)
        self.sample_size = sample_size
        self.fraction = fraction
        if self.sample_size is None and self.fraction is None:
            raise ValueError("Uniform plan requires 'sample_size' or 'fraction'")

    def execute(self, records: Sequence[Record]) -> SampleResult:
        population = list(records)
        n_population = len(population)
        if self.sample_size is None:
            size = max(1, math.floor(self.fraction * n_population))
        else:
            size = self.sample_size
        if size <= 0:
            raise ValueError("Sample size must be positive")
        if size > n_population:
            raise ValueError("Sample size cannot exceed population size for uniform sampling")

        rng = self.random()
        sampled_records = rng.sample(population, size)
        inclusion_probability = size / n_population
        sampled = [
            SampledRecord(record=record, inclusion_probability=inclusion_probability)
            for record in sampled_records
        ]
        return SampleResult(
            plan_type=self.plan_type,
            seed=self.seed,
            rng_state=rng.getstate(),
            sampled=sampled,
            metadata={
                "population_size": n_population,
                "sample_size": size,
            },
        )


class StratifiedSamplingPlan(SamplingPlan):
    plan_type = "stratified"

    def __init__(
        self,
        sample_size: Optional[int],
        strata: Sequence[str],
        allocations: Optional[Dict[str, int]],
        seed: Optional[int],
    ) -> None:
        super().__init__(seed)
        self.sample_size = sample_size
        self.strata = list(strata)
        self.allocations = allocations or {}
        if self.sample_size is None and not self.allocations:
            raise ValueError("Stratified plan requires 'sample_size' or explicit 'allocations'")

    def execute(self, records: Sequence[Record]) -> SampleResult:
        groups = group_by(records, self.strata)
        population_total = sum(len(group) for group in groups.values())
        if self.allocations:
            allocation = dict(self.allocations)
        else:
            if self.sample_size is None:
                raise ValueError("Sample size must be provided when allocations omitted")
            allocation = {
                name: max(1, round(self.sample_size * len(group) / population_total))
                for name, group in groups.items()
            }
        rng = self.random()
        sampled: List[SampledRecord] = []
        strata_metadata: Dict[str, Dict[str, int]] = {}
        for name, group in groups.items():
            group_size = len(group)
            desired = min(allocation.get(name, 0), group_size)
            strata_metadata[name] = {
                "population": group_size,
                "sample": desired,
            }
            if desired <= 0:
                continue
            sampled_records = rng.sample(group, desired)
            inclusion_probability = desired / group_size
            for record in sampled_records:
                sampled.append(
                    SampledRecord(record=record, inclusion_probability=inclusion_probability)
                )
        return SampleResult(
            plan_type=self.plan_type,
            seed=self.seed,
            rng_state=rng.getstate(),
            sampled=sampled,
            metadata={
                "strata": strata_metadata,
                "allocations": allocation,
                "strata_keys": self.strata,
                "sample_size": sum(item["sample"] for item in strata_metadata.values()),
            },
        )


class PPSSamplingPlan(SamplingPlan):
    plan_type = "pps"

    def __init__(self, sample_size: int, weight_column: str, seed: Optional[int]) -> None:
        super().__init__(seed)
        if sample_size is None:
            raise ValueError("PPS plan requires 'sample_size'")
        self.sample_size = int(sample_size)
        self.weight_column = weight_column
        if self.sample_size <= 0:
            raise ValueError("Sample size must be positive")

    def execute(self, records: Sequence[Record]) -> SampleResult:
        population = list(records)
        weights: List[float] = []
        for record in population:
            value = record.values.get(self.weight_column)
            if value is None:
                raise KeyError(
                    f"Weight column '{self.weight_column}' missing for record {record.index}"
                )
            try:
                weight = float(value)
            except (TypeError, ValueError) as exc:
                raise ValueError(
                    f"Weight column '{self.weight_column}' must be numeric"
                ) from exc
            if weight < 0:
                raise ValueError("Weight must be non-negative")
            weights.append(weight)
        total_weight = sum(weights)
        if total_weight <= 0:
            raise ValueError("Sum of weights must be positive for PPS sampling")

        rng = self.random()
        probabilities = [w / total_weight for w in weights]
        probability_map = {record.index: p for record, p in zip(population, probabilities)}
        sampled: Dict[int, SampledRecord] = {}
        for _ in range(self.sample_size):
            pick = rng.choices(population, weights=probabilities, k=1)[0]
            prob = probability_map[pick.index]
            entry = sampled.get(pick.index)
            if entry:
                entry.draw_count += 1
            else:
                inclusion_prob = 1 - (1 - prob) ** self.sample_size
                sampled[pick.index] = SampledRecord(
                    record=pick, inclusion_probability=inclusion_prob, draw_count=1
                )
        return SampleResult(
            plan_type=self.plan_type,
            seed=self.seed,
            rng_state=rng.getstate(),
            sampled=list(sampled.values()),
            metadata={
                "draws": self.sample_size,
                "probabilities": probability_map,
                "weight_column": self.weight_column,
            },
        )


class ReservoirSamplingPlan(SamplingPlan):
    plan_type = "reservoir"

    def __init__(self, sample_size: int, seed: Optional[int]) -> None:
        super().__init__(seed)
        if sample_size is None or sample_size <= 0:
            raise ValueError("Reservoir plan requires positive 'sample_size'")
        self.sample_size = int(sample_size)

    def execute(self, records: Sequence[Record]) -> SampleResult:
        population = list(records)
        if not population:
            raise ValueError("Population must contain at least one record")
        rng = self.random()
        reservoir: List[Record] = []
        for idx, record in enumerate(population):
            if idx < self.sample_size:
                reservoir.append(record)
            else:
                j = rng.randint(0, idx)
                if j < self.sample_size:
                    reservoir[j] = record
        population_size = len(population)
        actual_sample_size = min(self.sample_size, population_size)
        reservoir = reservoir[:actual_sample_size]
        inclusion_probability = min(1.0, self.sample_size / max(population_size, 1))
        sampled = [
            SampledRecord(record=record, inclusion_probability=inclusion_probability)
            for record in reservoir
        ]
        return SampleResult(
            plan_type=self.plan_type,
            seed=self.seed,
            rng_state=rng.getstate(),
            sampled=sampled,
            metadata={
                "population_size": population_size,
                "sample_size": len(reservoir),
            },
        )
