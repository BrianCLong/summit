import io
import json
import sys
from pathlib import Path
from typing import Tuple

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from server.ml.models.graph_anomaly import GraphAnomalyDetector, run_cli


def sample_graph() -> Tuple[list[dict], list[dict]]:
    nodes = [
        {"id": "a", "type": "Person", "tags": ["seed"]},
        {"id": "b", "type": "Org", "tags": []},
        {"id": "c", "type": "Location", "tags": ["watchlist", "vip"]},
        {"id": "d", "type": "Person", "tags": []},
    ]
    edges = [
        {"source": "a", "target": "b", "type": "WORKS_AT"},
        {"source": "b", "target": "c", "type": "OPERATES_IN"},
        {"source": "c", "target": "d", "type": "VISITED"},
        {"source": "a", "target": "d", "type": "ASSOCIATED_WITH"},
        {"source": "a", "target": "c", "type": "CONTACT"},
    ]
    return nodes, edges


def test_analyze_returns_scores_and_summary():
    nodes, edges = sample_graph()
    detector = GraphAnomalyDetector(contamination=0.2, random_state=7)
    result = detector.analyze(nodes, edges)

    assert result["summary"]["totalNodes"] == len(nodes)
    assert result["summary"]["totalEdges"] == len(edges)
    assert "threshold" in result["summary"]

    scored_nodes = result["nodes"]
    assert len(scored_nodes) == len(nodes)
    assert {node["id"] for node in scored_nodes} == {node["id"] for node in nodes}
    assert all("score" in node for node in scored_nodes)


def test_small_graph_uses_heuristic_path():
    nodes = [{"id": "a", "type": "Person", "tags": []}, {"id": "b", "type": "Org", "tags": []}]
    edges = [{"source": "a", "target": "b", "type": "LINK"}]
    detector = GraphAnomalyDetector(contamination=0.4)
    result = detector.analyze(nodes, edges)

    assert result["summary"]["totalNodes"] == 2
    assert result["summary"]["anomalyCount"] <= 2
    assert all(node["reason"].startswith("Heuristic") for node in result["nodes"])


def test_cli_round_trip(monkeypatch: pytest.MonkeyPatch):
    nodes, edges = sample_graph()
    payload = {"nodes": nodes, "edges": edges, "metadata": {"entityId": "a"}}

    input_stream = io.StringIO(json.dumps(payload))
    output_stream = io.StringIO()

    monkeypatch.setattr("sys.stdin", input_stream)
    monkeypatch.setattr("sys.stdout", output_stream)

    result = run_cli(["--threshold", "0.5"])
    assert result == 0

    output_stream.seek(0)
    parsed = json.loads(output_stream.read())
    assert parsed["summary"]["totalNodes"] == len(nodes)
    assert parsed["metadata"]["entityId"] == "a"

