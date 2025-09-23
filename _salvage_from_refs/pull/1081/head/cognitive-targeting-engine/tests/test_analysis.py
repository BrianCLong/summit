import os

# Temporarily add the parent directory to the path to allow importing app
# In a real project, you'd set up your PYTHONPATH or use a proper package structure
import sys
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import (
    HuggingFaceBackend,
    _process_text_in_background,
    bias_to_vectors,
    emotion_to_bias,
    results_cache,
)


# Mock the pipeline for HuggingFaceBackend
@pytest.fixture
def mock_pipeline():
    with patch("app.pipeline") as mock_pipe:
        mock_classifier = MagicMock()
        # Configure the mock to return a predictable structure for emotion classification
        mock_classifier.return_value = [
            [
                {"label": "joy", "score": 0.9},
                {"label": "neutral", "score": 0.05},
                {"label": "sadness", "score": 0.03},
            ]
        ]
        mock_pipe.return_value = mock_classifier
        yield mock_pipe


@pytest.fixture(autouse=True)
def clear_results_cache():
    """Fixture to clear the results_cache before each test."""
    results_cache.clear()


def test_huggingface_backend_classification(mock_pipeline):
    """Test if HuggingFaceBackend correctly calls the pipeline and returns results."""
    backend = HuggingFaceBackend()
    text = "This is a happy text."
    emotions = backend.classify_emotions(text)

    mock_pipeline.assert_called_once_with(
        "text-classification", model=backend.model_name, top_k=None
    )
    assert isinstance(emotions, list)
    assert len(emotions) > 0
    assert "label" in emotions[0]
    assert "score" in emotions[0]
    assert emotions[0]["label"] == "joy"


@pytest.mark.asyncio
async def test_process_text_in_background_success(mock_pipeline):
    """Test successful background processing and result storage."""
    task_id = "test_task_123"
    text = "I am feeling great!"

    await _process_text_in_background(task_id, text)

    assert task_id in results_cache
    assert results_cache[task_id]["status"] == "completed"
    assert "bias_profiles" in results_cache[task_id]["result"]
    assert "authority_bias" in results_cache[task_id]["result"]["bias_profiles"]
    assert (
        "expert_endorsement" in results_cache[task_id]["result"]["bias_profiles"]["authority_bias"]
    )


@pytest.mark.asyncio
async def test_process_text_in_background_failure(mock_pipeline):
    """Test background processing handles exceptions."""
    mock_pipeline.side_effect = Exception("NLP pipeline error")
    task_id = "test_task_fail"
    text = "This text will cause an error."

    await _process_text_in_background(task_id, text)

    assert task_id in results_cache
    assert results_cache[task_id]["status"] == "failed"
    assert "error" in results_cache[task_id]
    assert "NLP pipeline error" in results_cache[task_id]["error"]


def test_emotion_to_bias_mapping():
    """Test the emotion_to_bias mapping."""
    assert emotion_to_bias.get("joy") == "authority_bias"
    assert emotion_to_bias.get("fear") == "loss_aversion"
    assert emotion_to_bias.get("neutral") is None


def test_bias_to_vectors_mapping():
    """Test the bias_to_vectors mapping."""
    assert "fear_trigger" in bias_to_vectors.get("loss_aversion", [])
    assert "contradiction" in bias_to_vectors.get("confirmation_bias", [])
    assert "social_proof" in bias_to_vectors.get("authority_bias", [])
