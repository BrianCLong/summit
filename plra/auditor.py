"""Core auditor implementation for the pseudonym linkage risk auditor."""

from __future__ import annotations

import itertools
import random
from collections import Counter, OrderedDict, defaultdict
from typing import Dict, List, Mapping, Sequence, Tuple, Union

from .fixtures import load_seeded_fixture
from .report import MitigationAction, MitigationPlan, RiskReport

Record = Mapping[str, object]
Dataset = Sequence[Record]


def _ensure_dataset(dataset: Union[Dataset, "pandas.DataFrame"]) -> List[Dict[str, object]]:
    """Normalise the input dataset into a list of dictionaries."""

    try:  # Support pandas without taking it as a hard dependency.
        import pandas  # type: ignore

        if isinstance(dataset, pandas.DataFrame):  # pragma: no cover - optional path
            return dataset.to_dict(orient="records")
    except Exception:  # pragma: no cover - pandas is optional
        pass

    return [dict(record) for record in dataset]


class PseudonymLinkageRiskAuditor:
    """Estimate linkage risks between two pseudonymised datasets."""

    def __init__(self, quasi_identifiers: Sequence[str], seed: int = 1337):
        self.quasi_identifiers = tuple(quasi_identifiers)
        self.seed = seed
        self._rng = random.Random(seed)

    def analyze(
        self,
        dataset_sample: Union[Dataset, "pandas.DataFrame", None],
        population_reference: Union[Dataset, "pandas.DataFrame", None] = None,
    ) -> RiskReport:
        """Run the full audit pipeline and return a structured risk report."""

        sample = _ensure_dataset(dataset_sample or load_seeded_fixture(self.seed))
        population = _ensure_dataset(population_reference or sample)

        k_map = self._build_k_map(population)
        uniqueness_heatmap = self._uniqueness_heatmap(sample, population)
        overlap = self._quasi_identifier_overlap(sample, population)
        linkage_simulation = self._simulate_record_linkage(sample, population, k_map)
        risk_score, high_risk_records = self._overall_risk_score(linkage_simulation)
        mitigation_plan = self._propose_mitigations(sample, population, linkage_simulation, risk_score)

        return RiskReport(
            seed=self.seed,
            k_map=k_map,
            uniqueness_heatmap=uniqueness_heatmap,
            quasi_identifier_overlap=overlap,
            linkage_simulation=linkage_simulation,
            linkage_risk_score=risk_score,
            high_risk_records=high_risk_records,
            mitigation_plan=mitigation_plan,
        )

    # ---- Metric builders -------------------------------------------------

    def _build_k_map(self, population: Dataset) -> Mapping[str, object]:
        """Construct a K-map of the population reference dataset."""

        combo_counts = Counter(self._combo_key(record) for record in population)
        histogram = OrderedDict(sorted(combo_counts.items(), key=lambda item: item[0]))
        distribution: Dict[str, float] = OrderedDict()
        total = float(sum(histogram.values())) or 1.0
        for combo, count in histogram.items():
            distribution[combo] = count / total
        return OrderedDict(counts=histogram, distribution=distribution)

    def _uniqueness_heatmap(self, sample: Dataset, population: Dataset) -> Mapping[str, Mapping[str, float]]:
        """Compute uniqueness ratios for 1-way and 2-way quasi-identifier combos."""

        heatmap: Dict[str, Dict[str, float]] = OrderedDict()
        for size in (1, 2):
            for attributes in itertools.combinations(self.quasi_identifiers, size):
                label = "+".join(attributes)
                key_counts = Counter(
                    self._subcombo_key(record, attributes) for record in sample
                )
                pop_counts = Counter(
                    self._subcombo_key(record, attributes) for record in population
                )
                uniques = sum(1 for key in key_counts if pop_counts[key] == 1)
                heatmap.setdefault(str(size), OrderedDict())[label] = uniques / float(len(sample) or 1)
        return heatmap

    def _quasi_identifier_overlap(self, sample: Dataset, population: Dataset) -> Mapping[str, float]:
        overlap: Dict[str, float] = OrderedDict()
        for attr in self.quasi_identifiers:
            sample_values = {record.get(attr) for record in sample}
            population_values = {record.get(attr) for record in population}
            intersection = sample_values & population_values
            overlap[attr] = len(intersection) / float(len(sample_values) or 1)
        return overlap

    def _simulate_record_linkage(
        self,
        sample: Dataset,
        population: Dataset,
        k_map: Mapping[str, object],
    ) -> Mapping[str, object]:
        """Simulate record linkage via a simplified Fellegi–Sunter style model."""

        population_index: Dict[str, List[int]] = defaultdict(list)
        for idx, record in enumerate(population):
            population_index[self._combo_key(record)].append(idx)

        distribution = k_map["distribution"]

        matches: List[Dict[str, object]] = []
        for sample_idx, record in enumerate(sample):
            combo = self._combo_key(record)
            candidate_indices = population_index.get(combo, [])
            match_probability = 0.0
            risk_label = "no-match"
            if candidate_indices:
                rarity = distribution.get(combo, 0.0)
                match_probability = min(1.0, 1.0 / max(len(candidate_indices), 1))
                risk_label = self._risk_bucket(rarity, len(candidate_indices))
            matches.append(
                OrderedDict(
                    sample_index=sample_idx,
                    combo=combo,
                    candidate_count=len(candidate_indices),
                    match_probability=round(match_probability, 4),
                    risk=risk_label,
                )
            )

        buckets = Counter(item["risk"] for item in matches)
        bucket_distribution = OrderedDict(
            (label, buckets.get(label, 0) / float(len(matches) or 1))
            for label in ("high", "medium", "low", "no-match")
        )

        return OrderedDict(matches=matches, bucket_distribution=bucket_distribution)

    def _overall_risk_score(
        self, linkage_simulation: Mapping[str, object]
    ) -> Tuple[float, Tuple[int, ...]]:
        matches: List[Mapping[str, object]] = linkage_simulation["matches"]  # type: ignore[index]
        high_risk = [m["sample_index"] for m in matches if m["risk"] == "high"]
        medium_risk = [m["sample_index"] for m in matches if m["risk"] == "medium"]
        numerator = len(high_risk) + 0.5 * len(medium_risk)
        risk_score = numerator / float(len(matches) or 1)
        return (round(risk_score, 4), tuple(high_risk))

    def _propose_mitigations(
        self,
        sample: Dataset,
        population: Dataset,
        linkage_simulation: Mapping[str, object],
        baseline_risk: float,
    ) -> MitigationPlan:
        if not linkage_simulation["matches"]:  # type: ignore[index]
            return MitigationPlan()

        uniqueness = self._uniqueness_heatmap(sample, population)
        actions: List[MitigationAction] = []
        for attr in self.quasi_identifiers:
            attr_uniqueness = uniqueness["1"].get(attr, 0.0)
            if attr_uniqueness >= 0.01:
                actions.append(
                    MitigationAction(
                        attribute=attr,
                        strategy="generalise",
                        rationale=f"Reduce attribute granularity; {attr_uniqueness:.1%} of values unique",
                    )
                )

        if not actions:
            actions.append(
                MitigationAction(
                    attribute="token",
                    strategy="suppress",
                    rationale="Suppress direct identifiers to eliminate linkage options",
                )
            )

        details: Dict[str, float] = OrderedDict()
        mitigation_sample = [dict(record) for record in sample]
        mitigation_population = [dict(record) for record in population]
        projected_risk = baseline_risk

        for action in actions:
            if action.strategy == "generalise":
                self._generalise_attribute(mitigation_sample, mitigation_population, action.attribute)
            elif action.strategy == "suppress":
                self._suppress_attribute(mitigation_sample, mitigation_population, action.attribute)

            simulated = self._simulate_record_linkage(
                mitigation_sample,
                mitigation_population,
                self._build_k_map(mitigation_population),
            )
            projected_risk, _ = self._overall_risk_score(simulated)
            details[f"after_{action.attribute}_{action.strategy}"] = projected_risk

        return MitigationPlan(actions=tuple(actions), projected_risk_score=round(projected_risk, 4), details=details)

    # ---- Helper methods --------------------------------------------------

    def _combo_key(self, record: Mapping[str, object]) -> str:
        return "|".join(str(record.get(attr, "")) for attr in self.quasi_identifiers)

    def _subcombo_key(self, record: Mapping[str, object], attributes: Sequence[str]) -> str:
        return "|".join(str(record.get(attr, "")) for attr in attributes)

    def _risk_bucket(self, rarity: float, candidate_count: int) -> str:
        if candidate_count <= 1 and rarity <= 0.015:
            return "high"
        if candidate_count <= 2 and rarity <= 0.05:
            return "medium"
        if candidate_count <= 5 and rarity <= 0.2:
            return "low"
        return "no-match"

    def _generalise_attribute(
        self, sample: List[Dict[str, object]], population: List[Dict[str, object]], attribute: str
    ) -> None:
        replacement = f'[generalised:{attribute}]'
        for dataset in (sample, population):
            for record in dataset:
                record[attribute] = replacement

    def _suppress_attribute(
        self, sample: List[Dict[str, object]], population: List[Dict[str, object]], attribute: str
    ) -> None:
        for dataset in (sample, population):
            for record in dataset:
                record[attribute] = '[suppressed]'
