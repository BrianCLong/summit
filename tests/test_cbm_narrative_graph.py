import json
import os
from summit.cbm.narratives import build_narrative_graph, write_narrative_artifacts

def test_narrative_clustering(tmp_path):
    docs = [{"id": "doc1", "text": "Claim A"}]
    graph = build_narrative_graph(docs)

    assert "nodes" in graph
    assert len(graph["nodes"]) > 0

    artifact_path = os.path.join(tmp_path, "narratives.json")
    write_narrative_artifacts(graph, artifact_path)

    with open(artifact_path) as f:
        data = json.load(f)
        assert data["nodes"][0]["id"] == "claim_doc1"
        assert data["nodes"][1]["id"] == "narrative_1"
