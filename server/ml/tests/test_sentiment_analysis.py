"""Unit tests for the Summit sentiment analysis model."""

from __future__ import annotations

import json
import pathlib
import sys
from typing import Dict, List

import pytest


# Ensure the summit/server package root is on the Python path when running pytest
PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


from ml.models.sentiment_analysis import SentimentModel  # noqa: E402  (import after sys.path tweak)


class DummyPipeline:
    """Simple deterministic pipeline to avoid heavy model downloads in tests."""

    def __call__(self, text: str) -> List[Dict[str, float]]:
        # Pretend the model is very confident when the word "fantastic" appears
        if "fantastic" in text.lower():
            return [
                {"label": "POSITIVE", "score": 0.92},
                {"label": "NEGATIVE", "score": 0.04},
                {"label": "NEUTRAL", "score": 0.04},
            ]
        return [
            {"label": "NEGATIVE", "score": 0.55},
            {"label": "POSITIVE", "score": 0.30},
            {"label": "NEUTRAL", "score": 0.15},
        ]


def test_transformer_pipeline_is_used_when_available() -> None:
    model = SentimentModel(pipeline_factory=lambda _: DummyPipeline())

    result = model.analyze_text("This product is fantastic and works wonderfully!")

    assert result["label"] == "positive"
    assert pytest.approx(result["confidence"], rel=1e-6) == 0.92
    assert result["method"] == "transformer"
    assert result["probabilities"]["positive"] == pytest.approx(0.92)


def test_falls_back_to_lexical_model_when_pipeline_missing() -> None:
    model = SentimentModel(pipeline_factory=lambda _: (_ for _ in ()).throw(RuntimeError("boom")))

    result = model.analyze_text("This is a terrible and horrible failure.")

    assert result["label"] == "negative"
    assert result["method"] == "lexicon-rule"
    # Lexical model should produce a negative score
    assert result["score"] < 0


def test_batch_analysis_respects_metadata_order() -> None:
    model = SentimentModel(pipeline_factory=lambda _: DummyPipeline())
    texts = [
        "Fantastic execution with outstanding success.",
        "A neutral update with little detail.",
    ]
    metadata = [{"id": "1"}, {"id": "2"}]

    results = model.analyze_batch(texts, metadata=metadata)

    assert len(results) == 2
    assert results[0]["metadata"] == {"id": "1"}
    assert results[1]["metadata"] == {"id": "2"}


def test_cli_single_text(tmp_path: pathlib.Path) -> None:
    model = SentimentModel(pipeline_factory=lambda _: DummyPipeline())
    payload = model.analyze_text("fantastic progress")

    # Serialize the payload to simulate CLI output and ensure it's JSON compatible
    data = json.loads(json.dumps(payload))
    assert data["label"] == "positive"

