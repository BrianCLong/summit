from summit.subsumption.decentralized_ai.scorecard import DecentralizedAIScorecard


def _bundle() -> dict:
    return {
        "network": "meshnet",
        "claims": ["ITEM:CLAIM-02", "ITEM:CLAIM-01"],
        "validator_weights": [40, 30, 20, 10],
        "token_holders": [20, 15, 10, 5, 5, 5],
        "votes_cast": 600,
        "eligible_voters": 1000,
        "model_license": "Apache-2.0",
        "data_access_policy": "public-summary",
        "public_api_spec": "openapi.yaml",
        "standards": ["OpenAPI", "SPDX", "OCI", "ONNX"],
        "emission_policy": "fixed",
        "reward_distribution": "on-chain",
        "slashing_policy": "documented",
    }


def test_scorecard_is_deterministic() -> None:
    scorecard = DecentralizedAIScorecard(version="v0")
    first = scorecard.evaluate(_bundle())
    second = scorecard.evaluate(_bundle())

    assert first == second
    assert first["stamp"]["deterministic"] is True
    assert first["report"]["evidence_id"].startswith("DAI-meshnet-scorecard-")
