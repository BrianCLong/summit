import pathlib
import sys

from fastapi.testclient import TestClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "src"))
from main import app  # type: ignore


client = TestClient(app)


def test_graph_analysis_pipeline():
    payload = {
        "nodes": [{"id": node, "label": f"Node {node}"} for node in "abcdef"],
        "edges": [
            {"source": "a", "target": "b", "timestamp": "2024-01-01T00:00:00Z", "label": "ab"},
            {"source": "b", "target": "c", "timestamp": "2024-01-02T00:00:00Z", "label": "bc"},
            {"source": "c", "target": "a", "timestamp": "2024-01-03T00:00:00Z", "label": "ca"},
            {"source": "c", "target": "d", "timestamp": "2024-01-04T00:00:00Z", "label": "cd"},
            {"source": "d", "target": "e", "timestamp": "2024-01-04T01:00:00Z", "label": "de"},
            {"source": "e", "target": "f", "timestamp": "2024-01-05T00:00:00Z", "label": "ef"},
        ],
        "custom_algorithms": [
            {"name": "a_to_f_path", "algorithm": "shortest_path", "parameters": {"source": "a", "target": "f"}},
            {"name": "primary_pagerank", "algorithm": "pagerank", "parameters": {"alpha": 0.9}},
        ],
    }

    response = client.post("/graph/analyze", json=payload)
    assert response.status_code == 200
    body = response.json()

    triangle_sets = [set(triangle) for triangle in body["patterns"]["triangles"]]
    assert {"a", "b", "c"} in triangle_sets

    centrality = body["centrality"]
    assert set("abcdef").issubset(centrality["degree"].keys())
    assert centrality["top_hubs"][0] in "abc"

    communities = [set(comm) for comm in body["communities"]["communities"]]
    assert any({"a", "b", "c"}.issubset(comm) for comm in communities)

    temporal = body["temporal"]
    assert temporal["start"].startswith("2024-01-01")
    assert temporal["activity_by_day"]["2024-01-04"] == 2
    assert temporal["recency_by_node"]["f"].startswith("2024-01-05")

    custom = {entry["name"]: entry for entry in body["custom_algorithms"]}
    assert custom["a_to_f_path"]["result"]["path"][0] == "a"
    assert custom["a_to_f_path"]["result"]["path"][-1] == "f"
    assert "primary_pagerank" in custom

    visualization = body["visualization"]
    assert len(visualization["nodes"]) == 6
    assert len(visualization["edges"]) == len(payload["edges"])
    assert all("x" in node and "y" in node for node in visualization["nodes"])
