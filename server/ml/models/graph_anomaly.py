"""Graph traversal anomaly detection utilities for IntelGraph.

This module provides an Isolation Forest-based detector that scores nodes in a
subgraph extracted from Neo4j traversals. It is designed to be executed as a
standalone CLI (reading JSON from stdin) or imported as a library by the
Node.js GraphAnomalyService.
"""
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from statistics import median
from typing import Any, Dict, Iterable, List, Tuple

import numpy as np
from sklearn.ensemble import IsolationForest


@dataclass
class NodeFeatureSummary:
    """Intermediate feature representation for a graph node."""

    node_id: str
    degree: int
    type_diversity: int
    tag_count: int
    neighbor_degree: float
    normalized_degree: float
    label: str | None = None
    type: str | None = None


class GraphAnomalyDetector:
    """Detect anomalous interaction patterns in graph traversals."""

    def __init__(
        self,
        contamination: float = 0.15,
        random_state: int = 42,
        n_estimators: int = 200,
    ) -> None:
        if contamination <= 0:
            raise ValueError("contamination must be > 0")

        self.contamination = contamination
        self.random_state = random_state
        self.n_estimators = n_estimators

    def analyze(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        *,
        threshold: float | None = None,
    ) -> Dict[str, Any]:
        """Compute anomaly scores for the provided traversal."""

        if not nodes:
            return {
                "summary": {
                    "totalNodes": 0,
                    "totalEdges": len(edges),
                    "anomalyCount": 0,
                    "modelVersion": "isolation-forest-v1",
                    "threshold": threshold if threshold is not None else 0.0,
                    "contamination": self.contamination,
                },
                "nodes": [],
            }

        features, summaries = self._build_feature_matrix(nodes, edges)

        if len(summaries) < 3 or features.shape[0] < 3:
            return self._heuristic_response(summaries, edges, threshold)

        effective_contamination = min(max(self.contamination, 1.0 / len(summaries)), 0.5)
        model = IsolationForest(
            contamination=effective_contamination,
            random_state=self.random_state,
            n_estimators=self.n_estimators,
        )
        model.fit(features)
        raw_scores = -model.score_samples(features)

        computed_threshold = (
            threshold
            if threshold is not None
            else float(np.quantile(raw_scores, 1 - effective_contamination))
        )

        degree_values = [s.degree for s in summaries]
        type_values = [s.type_diversity for s in summaries]
        neighbor_values = [s.neighbor_degree for s in summaries]

        degree_median = median(degree_values) if degree_values else 0.0
        type_median = median(type_values) if type_values else 0.0
        neighbor_median = median(neighbor_values) if neighbor_values else 0.0

        node_results: List[Dict[str, Any]] = []
        anomaly_count = 0

        for idx, summary in enumerate(summaries):
            score = float(raw_scores[idx])
            is_anomaly = score >= computed_threshold
            if is_anomaly:
                anomaly_count += 1

            explanation = self._build_explanation(
                summary,
                score,
                computed_threshold,
                degree_median,
                type_median,
                neighbor_median,
            )

            node_results.append(
                {
                    "id": summary.node_id,
                    "score": score,
                    "isAnomaly": is_anomaly,
                    "reason": explanation,
                    "metrics": {
                        "degree": summary.degree,
                        "typeDiversity": summary.type_diversity,
                        "tagCount": summary.tag_count,
                        "neighborDegree": round(summary.neighbor_degree, 3),
                        "normalizedDegree": round(summary.normalized_degree, 3),
                    },
                    "label": summary.label,
                    "type": summary.type,
                }
            )

        response = {
            "summary": {
                "totalNodes": len(summaries),
                "totalEdges": len(edges),
                "anomalyCount": anomaly_count,
                "modelVersion": "isolation-forest-v1",
                "threshold": float(computed_threshold),
                "contamination": float(effective_contamination),
            },
            "nodes": node_results,
        }
        return response

    def _build_feature_matrix(
        self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]
    ) -> Tuple[np.ndarray, List[NodeFeatureSummary]]:
        adjacency: Dict[str, List[Dict[str, Any]]] = {
            str(node.get("id")): [] for node in nodes if node.get("id") is not None
        }

        for edge in edges:
            source = str(edge.get("source")) if edge.get("source") is not None else None
            target = str(edge.get("target")) if edge.get("target") is not None else None
            if source and source in adjacency:
                adjacency[source].append(edge)
            if target and target in adjacency:
                adjacency[target].append(edge)

        degrees = {node_id: len(edges) for node_id, edges in adjacency.items()}
        max_degree = max(degrees.values()) if degrees else 1

        summaries: List[NodeFeatureSummary] = []
        feature_rows: List[List[float]] = []

        for node in nodes:
            node_id = str(node.get("id"))
            neighbors = adjacency.get(node_id, [])
            degree = len(neighbors)
            type_diversity = len({edge.get("type") or "UNKNOWN" for edge in neighbors})
            tag_count = len(node.get("tags") or [])

            neighbor_ids = self._neighbor_ids(node_id, neighbors)
            neighbor_degree_values = [degrees.get(n_id, 0) for n_id in neighbor_ids]
            neighbor_degree = float(np.mean(neighbor_degree_values)) if neighbor_degree_values else 0.0

            normalized_degree = degree / max_degree if max_degree else 0.0

            summaries.append(
                NodeFeatureSummary(
                    node_id=node_id,
                    degree=degree,
                    type_diversity=type_diversity,
                    tag_count=tag_count,
                    neighbor_degree=neighbor_degree,
                    normalized_degree=normalized_degree,
                    label=node.get("label"),
                    type=node.get("type"),
                )
            )

            feature_rows.append(
                [
                    float(degree),
                    float(type_diversity),
                    float(tag_count),
                    neighbor_degree,
                    normalized_degree,
                ]
            )

        feature_matrix = np.array(feature_rows, dtype=float)
        return feature_matrix, summaries

    def _heuristic_response(
        self,
        summaries: List[NodeFeatureSummary],
        edges: List[Dict[str, Any]],
        threshold: float | None,
    ) -> Dict[str, Any]:
        if not summaries:
            computed_threshold = threshold if threshold is not None else 0.0
            return {
                "summary": {
                    "totalNodes": 0,
                    "totalEdges": len(edges),
                    "anomalyCount": 0,
                    "modelVersion": "isolation-forest-v1",
                    "threshold": computed_threshold,
                    "contamination": self.contamination,
                },
                "nodes": [],
            }

        max_degree = max(summary.degree for summary in summaries) or 1
        scores: List[float] = []
        node_results: List[Dict[str, Any]] = []

        for summary in summaries:
            # Higher score for isolated nodes or very high tag/type variance
            isolation_bonus = 1.0 if summary.degree == 0 else 0.0
            tag_variance = summary.tag_count / (summary.degree + 1)
            type_variance = summary.type_diversity / (summary.degree + 1)
            normalized_degree = summary.degree / max_degree

            score = float(isolation_bonus + tag_variance + type_variance + (1 - normalized_degree))
            scores.append(score)

        computed_threshold = threshold if threshold is not None else float(np.percentile(scores, 85))
        anomaly_count = 0

        for idx, summary in enumerate(summaries):
            score = scores[idx]
            is_anomaly = score >= computed_threshold
            if is_anomaly:
                anomaly_count += 1

            node_results.append(
                {
                    "id": summary.node_id,
                    "score": score,
                    "isAnomaly": is_anomaly,
                    "reason": "Heuristic anomaly scoring applied due to limited sample size",
                    "metrics": {
                        "degree": summary.degree,
                        "typeDiversity": summary.type_diversity,
                        "tagCount": summary.tag_count,
                        "neighborDegree": round(summary.neighbor_degree, 3),
                        "normalizedDegree": round(summary.normalized_degree, 3),
                    },
                    "label": summary.label,
                    "type": summary.type,
                }
            )

        return {
            "summary": {
                "totalNodes": len(summaries),
                "totalEdges": len(edges),
                "anomalyCount": anomaly_count,
                "modelVersion": "isolation-forest-v1",
                "threshold": float(computed_threshold),
                "contamination": self.contamination,
            },
            "nodes": node_results,
        }

    def _neighbor_ids(
        self,
        node_id: str,
        neighbors: Iterable[Dict[str, Any]],
    ) -> List[str]:
        neighbor_ids: List[str] = []
        for edge in neighbors:
            source = str(edge.get("source")) if edge.get("source") is not None else None
            target = str(edge.get("target")) if edge.get("target") is not None else None
            other = None
            if source == node_id and target:
                other = target
            elif target == node_id and source:
                other = source
            if other:
                neighbor_ids.append(other)
        return neighbor_ids

    def _build_explanation(
        self,
        summary: NodeFeatureSummary,
        score: float,
        threshold: float,
        degree_median: float,
        type_median: float,
        neighbor_median: float,
    ) -> str:
        messages: List[str] = []

        if summary.degree <= max(1.0, degree_median / 2):
            messages.append("low degree compared to peers")
        elif summary.degree > max(degree_median * 2, degree_median + 3):
            messages.append("spike in degree compared to peers")

        if summary.type_diversity > max(type_median * 1.5, type_median + 2):
            messages.append("high relationship diversity")
        elif summary.type_diversity == 0:
            messages.append("only one relationship type observed")

        if summary.neighbor_degree > neighbor_median * 1.5 and summary.degree == 1:
            messages.append("connects to high-degree hub")

        if summary.tag_count > 5:
            messages.append("numerous tags associated")

        messages.append(f"score {score:.3f} vs threshold {threshold:.3f}")
        return ", ".join(messages)


def run_cli(argv: List[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Graph traversal anomaly detection")
    parser.add_argument("--threshold", type=float, default=None, help="Score threshold override")
    parser.add_argument(
        "--contamination",
        type=float,
        default=0.15,
        help="Contamination ratio for Isolation Forest",
    )
    parser.add_argument(
        "--random-state", type=int, default=42, help="Random seed for deterministic runs"
    )
    args = parser.parse_args(argv)

    raw_input = sys.stdin.read()
    if not raw_input.strip():
        print(json.dumps({"error": "No input provided"}))
        return 1

    payload = json.loads(raw_input)
    nodes = payload.get("nodes", [])
    edges = payload.get("edges", [])

    detector = GraphAnomalyDetector(
        contamination=max(args.contamination, 1e-3),
        random_state=args.random_state,
    )
    result = detector.analyze(nodes, edges, threshold=args.threshold)

    metadata = payload.get("metadata") or {}
    if metadata:
        result["metadata"] = metadata

    print(json.dumps(result, default=_json_default))
    return 0


def _json_default(value: Any) -> Any:
    if isinstance(value, (np.float32, np.float64)):
        return float(value)
    if isinstance(value, (np.int32, np.int64)):
        return int(value)
    raise TypeError(f"Type {type(value)} is not JSON serializable")


if __name__ == "__main__":
    sys.exit(run_cli())
