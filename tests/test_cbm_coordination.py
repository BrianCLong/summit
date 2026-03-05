import json
import os
from summit.cbm.coordination import detect_coordination, write_influence_artifacts

def test_coordination_detection(tmp_path):
    assets = [{"id": "asset1", "activity": "spam"}]
    graph = detect_coordination(assets)

    assert "nodes" in graph
    assert len(graph["nodes"]) > 0

    artifact_path = os.path.join(tmp_path, "influence_graph.json")
    write_influence_artifacts(graph, artifact_path)

    with open(artifact_path) as f:
        data = json.load(f)
        assert data["nodes"][0]["id"] == "actor_asset1"
        assert data["nodes"][1]["id"] == "coordination_cell_1"
