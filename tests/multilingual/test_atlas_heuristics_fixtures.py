import pytest

import summit.flags
from summit.planning.multilingual.atlas.heuristics import (
    ATLAS_K_DOUBLE_DATA_MULT,
    ATLAS_K_DOUBLE_MODEL_MULT,
    scale_for_language_count,
)
from summit.planning.multilingual.atlas.planner import AtlasPlanner
from summit.planning.multilingual.planner import PlanRequest


def test_atlas_heuristics_doubling():
    scaling = scale_for_language_count(1, 2)
    assert scaling.model_mult == pytest.approx(ATLAS_K_DOUBLE_MODEL_MULT)
    assert scaling.data_mult == pytest.approx(ATLAS_K_DOUBLE_DATA_MULT)

def test_atlas_heuristics_quadrupling():
    scaling = scale_for_language_count(1, 4)
    assert scaling.model_mult == pytest.approx(ATLAS_K_DOUBLE_MODEL_MULT ** 2)
    assert scaling.data_mult == pytest.approx(ATLAS_K_DOUBLE_DATA_MULT ** 2)

def test_atlas_heuristics_noop():
    scaling = scale_for_language_count(10, 10)
    assert scaling.model_mult == 1.0
    assert scaling.data_mult == 1.0

def test_atlas_planner_flag_off(monkeypatch):
    monkeypatch.setattr(summit.flags, "ATLAS_PLANNER_ENABLED", False)
    planner = AtlasPlanner()
    req = PlanRequest(
        target_language="fr",
        training_languages=["en", "fr"],
        token_budget=1000,
        model_size_params=100
    )
    res = planner.plan(req)
    # Should match baseline (identity)
    assert res.recommended_model_params == 100
    assert res.recommended_total_tokens == 1000
    assert res.provenance["planner"] == "BaselinePlanner"

def test_atlas_planner_flag_on(monkeypatch):
    monkeypatch.setattr(summit.flags, "ATLAS_PLANNER_ENABLED", True)
    planner = AtlasPlanner()
    req = PlanRequest(
        target_language="fr",
        training_languages=["en", "fr"], # K=2
        token_budget=1000,
        model_size_params=100
    )
    res = planner.plan(req)
    # Doubling K=1 -> K=2
    assert res.recommended_model_params == pytest.approx(100 * ATLAS_K_DOUBLE_MODEL_MULT)
    assert res.recommended_total_tokens == pytest.approx(1000 * ATLAS_K_DOUBLE_DATA_MULT)
    assert res.provenance["planner"] == "AtlasPlanner"
