"""Hybrid Entity Resolution pipeline."""

from __future__ import annotations

import uuid
from collections.abc import Iterable
from dataclasses import dataclass

import numpy as np

from .matchers import EmbeddingMatcher, double_metaphone, jaro_winkler


@dataclass
class ERResult:
    id1: str
    id2: str
    score: float
    match: bool
    explanation: dict[str, float]
    trace_id: str


class ERPipeline:
    """Pluggable entity resolution pipeline."""

    def __init__(self, threshold: float = 0.85) -> None:
        self.threshold = threshold
        self._records: dict[str, str] = {}
        self._id_index: dict[str, int] = {}
        self._embedding = EmbeddingMatcher()

    # ----------------------- Fit & Candidates -----------------------
    def fit(self, records: dict[str, str]) -> None:
        self._records = records
        self._id_index = {rid: idx for idx, rid in enumerate(records)}
        self._embedding.fit(records.values())

    def _block_key(self, name: str) -> tuple[str, str]:
        return (double_metaphone(name), (name or "")[0:1].lower())

    def candidate_pairs(self) -> list[tuple[str, str]]:
        buckets: dict[tuple[str, str], list[str]] = {}
        for rid, name in self._records.items():
            key = self._block_key(name)
            buckets.setdefault(key, []).append(rid)
        pairs: list[tuple[str, str]] = []
        for ids in buckets.values():
            for i in range(len(ids)):
                for j in range(i + 1, len(ids)):
                    pairs.append((ids[i], ids[j]))
        return pairs

    # -------------------------- Scoring ----------------------------
    def score_pair(self, id1: str, id2: str) -> tuple[float, dict[str, float]]:
        name1 = self._records[id1]
        name2 = self._records[id2]
        jw = jaro_winkler(name1, name2)
        sim = self._embedding.similarity(self._id_index[id1], self._id_index[id2])
        score = float(0.5 * jw + 0.5 * sim)
        explanation = {"jaro_winkler": jw, "tfidf_cosine": sim}
        return score, explanation

    # ------------------------- Thresholding -----------------------
    def calibrate_threshold(
        self, labeled_pairs: Iterable[tuple[str, str, int]]
    ) -> tuple[float, float]:
        best_f1 = -1.0
        best_t = self.threshold
        for t in np.linspace(0.0, 1.0, 101):
            tp = fp = fn = 0
            for a, b, label in labeled_pairs:
                score, _ = self.score_pair(a, b)
                pred = score >= t
                if pred and label:
                    tp += 1
                elif pred and not label:
                    fp += 1
                elif not pred and label:
                    fn += 1
            precision = tp / (tp + fp) if tp + fp else 0.0
            recall = tp / (tp + fn) if tp + fn else 0.0
            f1 = (2 * precision * recall / (precision + recall)) if precision + recall else 0.0
            if f1 > best_f1:
                best_f1, best_t = f1, t
        self.threshold = best_t
        return best_t, best_f1

    # -------------------------- Resolve ---------------------------
    def resolve(self) -> list[ERResult]:
        results: list[ERResult] = []
        for id1, id2 in self.candidate_pairs():
            score, explanation = self.score_pair(id1, id2)
            match = score >= self.threshold
            results.append(
                ERResult(
                    id1=id1,
                    id2=id2,
                    score=score,
                    match=match,
                    explanation=explanation,
                    trace_id=str(uuid.uuid4()),
                ),
            )
        return results
