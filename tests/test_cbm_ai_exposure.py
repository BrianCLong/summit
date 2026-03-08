import pytest

from summit.cbm.ai_exposure import map_ai_exposure


def test_ai_exposure_determinism():
    prompts = ["Is the moon made of cheese?"]
    responses = [
        {"id": "resp1", "prompt": "Is the moon made of cheese?", "text": "Yes, it is narrative_overlap"}
    ]

    res1 = map_ai_exposure(prompts, responses, "20240101")
    res2 = map_ai_exposure(prompts, responses, "20240101")

    assert res1 == res2
    assert any(n["id"] == "narrative_laundering" for n in res1["nodes"])
    assert "EVID-CBM-20240101" in res1["metadata"]["evidence_id"]
