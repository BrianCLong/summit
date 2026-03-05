import json
from pathlib import Path

import pytest

from pipelines.decentralized_ai_pipeline import run


def test_pipeline_writes_deterministic_artifacts(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENABLE_DAI_SUBSUMPTION", "true")
    bundle = {
        "network": "meshnet",
        "claims": ["ITEM:CLAIM-01"],
        "validator_weights": [40, 30, 20, 10],
        "token_holders": [20, 10, 5, 5],
        "votes_cast": 50,
        "eligible_voters": 100,
        "model_license": "Apache-2.0",
        "data_access_policy": "public",
        "public_api_spec": "openapi.yaml",
        "standards": ["OpenAPI", "SPDX", "OCI", "ONNX"],
    }

    artifacts = run(bundle, tmp_path)

    for name in ["report", "metrics", "stamp"]:
        payload = json.loads((tmp_path / f"{name}.json").read_text(encoding="utf-8"))
        assert payload == artifacts[name]


def test_pipeline_requires_feature_flag(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ENABLE_DAI_SUBSUMPTION", raising=False)
    with pytest.raises(RuntimeError):
        run({}, tmp_path)
