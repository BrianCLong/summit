import time

from summit.subsumption.decentralized_ai.scorecard import DecentralizedAIScorecard


def test_decentralized_ai_perf_budget() -> None:
    bundle = {
        "network": "meshnet",
        "claims": ["ITEM:CLAIM-01", "ITEM:CLAIM-02", "ITEM:CLAIM-03"],
        "validator_weights": [10] * 100,
        "token_holders": [1] * 1000,
        "votes_cast": 800,
        "eligible_voters": 1000,
        "model_license": "Apache-2.0",
        "data_access_policy": "public",
        "public_api_spec": "openapi.yaml",
        "standards": ["OpenAPI", "SPDX", "OCI", "ONNX"],
        "emission_policy": "fixed",
        "reward_distribution": "documented",
        "slashing_policy": "documented",
    }

    start = time.perf_counter()
    DecentralizedAIScorecard().evaluate(bundle)
    elapsed = time.perf_counter() - start

    assert elapsed < 2.0
