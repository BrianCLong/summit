import math
import sys
from pathlib import Path

import numpy as np
import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
GWDE_PYTHON = PROJECT_ROOT / "gwde" / "python"
if str(GWDE_PYTHON) not in sys.path:
    sys.path.insert(0, str(GWDE_PYTHON))

import gwde  # noqa: E402
from gwde import roc  # noqa: E402


@pytest.fixture(scope="module")
def rng():
    return np.random.default_rng(42)


def test_text_watermark_detection_survives_paraphrase(rng):
    text = "The quick brown fox jumps over the lazy dog twice for testing."
    key = "text-key"
    seed = 12345
    embedded = gwde.embed(text, key, seed)
    detection = gwde.detect(embedded["watermarked"])
    assert detection.score > 0.82
    assert detection.fp < 1e-3

    laundering = gwde.laundering_simulations(embedded["watermarked"])
    paraphrased = laundering["paraphrase"]
    paraphrased_detection = gwde.detect(paraphrased)
    assert paraphrased_detection.score < detection.score
    assert paraphrased_detection.score > 0.65
    assert paraphrased_detection.fp < 0.05

    unmarked_detection = gwde.detect(text)
    assert unmarked_detection.score < 0.6
    assert unmarked_detection.fp > 0.1


def test_image_watermark_handles_compression_and_resize(rng):
    image = rng.integers(0, 255, size=(64, 64, 3), dtype=np.uint8)
    key = "image-key"
    seed = 67890
    embedded = gwde.embed(image, key, seed)
    detection = gwde.detect(embedded["watermarked"])
    assert detection.score > 0.75
    assert detection.fp < 1e-4

    laundering = gwde.laundering_simulations(embedded["watermarked"])
    compressed = laundering["compress"]
    resized = laundering["resize"]

    compressed_detection = gwde.detect(compressed)
    resized_detection = gwde.detect(resized)

    assert compressed_detection.score < detection.score
    assert resized_detection.score < detection.score

    baseline_detection = gwde.detect(image)
    assert compressed_detection.score > baseline_detection.score + 0.05
    assert resized_detection.score > baseline_detection.score + 0.05

    assert compressed_detection.fp < baseline_detection.fp
    assert resized_detection.fp < baseline_detection.fp


def test_roc_generator_reports_auc_above_threshold(rng):
    key = "roc-key"
    seed = 24680
    positives = []
    negatives = []
    base_text = "Signal integrity is essential for authenticity checks."
    for _ in range(30):
        embedded = gwde.embed(base_text, key, seed)
        positives.append(gwde.detect(embedded["watermarked"]).score)
        negatives.append(gwde.detect(base_text).score)

    scores = positives + negatives
    labels = [1] * len(positives) + [0] * len(negatives)
    roc_points = roc.generate_roc(scores, labels, steps=51)
    auc_value = roc.auc(roc_points)
    assert auc_value > 0.88

