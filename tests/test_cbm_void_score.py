import json
import os
from summit.cbm.void_score import calculate_void_score, write_void_artifacts

def test_void_score(tmp_path):
    score = calculate_void_score("health", "en-US", 0.2)
    assert score["risk_score"] == 0.8

    scores = [score, calculate_void_score("finance", "es-ES", 0.9)]

    artifact_path = os.path.join(tmp_path, "data_void_risk.json")
    write_void_artifacts(scores, artifact_path)

    with open(artifact_path) as f:
        data = json.load(f)
        assert len(data) == 2
        assert data[0]["topic"] == "finance"
