"""Tests for the entity explainability engine."""

import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from server.ml.explainability.entity_explainer import (  # noqa: E402
    EntityExplanationEngine,
    explain_entities,
)


def sample_text() -> str:
    return "John Doe met with TechCorp in Seattle on March 3, 2024."  # noqa: E501


def sample_entities():
    return [
        {
            "text": "John Doe",
            "label": "PERSON",
            "confidence": 0.92,
            "start": 0,
            "end": 8,
        },
        {
            "text": "TechCorp",
            "label": "ORGANIZATION",
            "confidence": 0.88,
            "start": 18,
            "end": 26,
        },
        {
            "text": "Seattle",
            "label": "LOCATION",
            "confidence": 0.81,
            "start": 30,
            "end": 37,
        },
    ]


def test_engine_returns_explanations_for_entities():
    engine = EntityExplanationEngine()
    explanations = engine.explain_entities(sample_text(), sample_entities(), method="auto", top_k=3)

    assert len(explanations) == 3
    for explanation in explanations:
        assert explanation["entityText"]
        assert explanation["label"]
        assert isinstance(explanation["featureWeights"], list)
        assert explanation["featureWeights"], "expected non-empty feature weights"
        assert explanation["summary"]


def test_module_helper_matches_engine_output():
    engine = EntityExplanationEngine()
    engine_output = engine.explain_entities(sample_text(), sample_entities(), method="heuristic", top_k=2)
    helper_output = explain_entities(sample_text(), sample_entities(), method="heuristic", top_k=2)

    assert helper_output == engine_output
    assert helper_output[0]["method"] == engine.last_used_method
