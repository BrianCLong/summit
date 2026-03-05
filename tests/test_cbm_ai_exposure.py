import json
import os
from summit.cbm.ai_exposure import map_ai_exposure, write_exposure_artifacts

def test_ai_exposure(tmp_path):
    prompts = [{"text": "Probe query"}]
    exposure = map_ai_exposure(prompts)

    assert exposure["laundering_risk"] == 0.85

    artifact_path = os.path.join(tmp_path, "ai_exposure.json")
    write_exposure_artifacts(exposure, artifact_path)

    with open(artifact_path) as f:
        data = json.load(f)
        assert data["overlap_score"] == 0.7
