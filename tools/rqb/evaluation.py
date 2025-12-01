"""Evaluation harness for the Redaction Quality Benchmark."""

from __future__ import annotations

import hashlib
import random
import statistics
import time
from dataclasses import dataclass
from typing import Dict, Iterable, List, Mapping, MutableMapping

from .data import DATASET, BenchmarkRecord, PIIEntity
from .detectors import Detector


@dataclass
class BenchmarkResult:
    """Structured evaluation output."""

    detector_name: str
    summary: Dict[str, float]
    per_entity: Dict[str, Dict[str, float]]
    confusion_matrix: Dict[str, Dict[str, int]]
    latency: Dict[str, float]
    records_evaluated: int

    def to_dict(self) -> Dict[str, object]:
        return {
            "detector": self.detector_name,
            "summary": self.summary,
            "per_entity": self.per_entity,
            "confusion_matrix": self.confusion_matrix,
            "latency": self.latency,
            "records_evaluated": self.records_evaluated,
        }


class BenchmarkHarness:
    """Runs detectors against the benchmark dataset and computes metrics."""

    def __init__(self, dataset: Iterable[BenchmarkRecord] | None = None, seed: int = 1337) -> None:
        self._dataset = list(dataset or DATASET)
        self._seed = seed

    def run(self, detector: Detector) -> BenchmarkResult:
        overall_tp = 0
        overall_fp = 0
        overall_fn = 0
        per_entity_counts: Dict[str, Dict[str, int]] = {}
        latencies: List[float] = []
        for record in self._dataset:
            record_rng = random.Random(_seed_for(self._seed, record.record_id))
            start = time.perf_counter()
            predictions = detector.detect(record, rng=record_rng)
            latencies.append(time.perf_counter() - start)
            truth_index = _index_entities(record.entities)
            pred_index = _index_entities(predictions)
            labels = truth_index.keys() | pred_index.keys()
            for label in labels:
                truth_set = truth_index.get(label, set())
                pred_set = pred_index.get(label, set())
                tp = len(truth_set & pred_set)
                fp = len(pred_set - truth_set)
                fn = len(truth_set - pred_set)
                counts = per_entity_counts.setdefault(label, {"tp": 0, "fp": 0, "fn": 0})
                counts["tp"] += tp
                counts["fp"] += fp
                counts["fn"] += fn
                overall_tp += tp
                overall_fp += fp
                overall_fn += fn

        summary = _compute_metrics(overall_tp, overall_fp, overall_fn)
        per_entity_metrics: Dict[str, Dict[str, float]] = {}
        confusion_matrix: Dict[str, Dict[str, int]] = {}
        for label, counts in sorted(per_entity_counts.items()):
            per_entity_metrics[label] = _compute_metrics(counts["tp"], counts["fp"], counts["fn"])
            per_entity_metrics[label]["support"] = float(counts["tp"] + counts["fn"])
            confusion_matrix[label] = dict(counts)

        latency_stats = _summarise_latency(latencies)
        summary["support"] = float(sum(len(record.entities) for record in self._dataset))
        return BenchmarkResult(
            detector_name=detector.name,
            summary=summary,
            per_entity=per_entity_metrics,
            confusion_matrix=confusion_matrix,
            latency=latency_stats,
            records_evaluated=len(self._dataset),
        )


def _seed_for(seed: int, record_id: str) -> int:
    digest = hashlib.sha256(f"{seed}:{record_id}".encode("utf-8")).digest()
    return int.from_bytes(digest[:8], "big", signed=False)


def _index_entities(entities: Iterable[PIIEntity]) -> Mapping[str, set[str]]:
    index: MutableMapping[str, set[str]] = {}
    for entity in entities:
        index.setdefault(entity.label, set()).add(entity.location)
    return index


def _compute_metrics(tp: int, fp: int, fn: int) -> Dict[str, float]:
    precision = tp / (tp + fp) if tp + fp else 1.0 if tp == 0 and fp == 0 else 0.0
    recall = tp / (tp + fn) if tp + fn else 1.0
    if precision + recall:
        f1 = 2 * precision * recall / (precision + recall)
    else:
        f1 = 0.0
    return {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
    }


def _summarise_latency(latencies: List[float]) -> Dict[str, float]:
    if not latencies:
        return {"mean_ms": 0.0, "median_ms": 0.0, "p95_ms": 0.0}
    ordered = sorted(latencies)
    mean_ms = statistics.mean(ordered) * 1000
    median_ms = statistics.median(ordered) * 1000
    p95_index = min(len(ordered) - 1, int(round(0.95 * (len(ordered) - 1))))
    p95_ms = ordered[p95_index] * 1000
    return {
        "mean_ms": round(mean_ms, 4),
        "median_ms": round(median_ms, 4),
        "p95_ms": round(p95_ms, 4),
    }
