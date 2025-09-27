"""Integrated pipeline for anomaly detection, threat forecasting,
entity extraction, translation and computer vision.

This module provides a high level ``IntelligencePipeline`` class that ties
core analytics capabilities together. The goal is to offer a simple interface
for downstream services to analyse multilingual unstructured data and
visual sources such as satellite images or video frames.

The implementations are deliberately lightweight so that the module can run
inside the test environment without heavy model downloads.  When optional
third‑party models are unavailable, the pipeline gracefully falls back to
naïve heuristics.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List

import numpy as np
import torch
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression


@dataclass
class IntelligencePipeline:
    """Container object orchestrating multiple analytic stages.

    Parameters
    ----------
    translator: optional callable
        Function used to translate text to English.  When ``None`` a small
        HuggingFace translation pipeline is attempted; if that fails a
        pass‑through translator is used.
    vision_model: optional ``torch.nn.Module``
        Model used for extracting information from images.  Defaults to a
        randomly initialised ``resnet18`` which is adequate for tests.
    """

    translator: callable | None = None
    vision_model: torch.nn.Module | None = None

    def __post_init__(self) -> None:  # pragma: no cover - trivial
        if self.translator is None:
            self.translator = self._build_translator()
        if self.vision_model is None:
            self.vision_model = self._build_vision_model()
        # ensure model is in evaluation mode
        self.vision_model.eval()

    # -- Builders ---------------------------------------------------------
    def _build_translator(self):  # pragma: no cover - network optional
        """Attempt to construct a lightweight translation pipeline."""
        try:
            from transformers import pipeline as hf_pipeline

            return hf_pipeline("translation", model="Helsinki-NLP/opus-mt-mul-en")
        except Exception:
            # Fallback translator simply echoes the input
            return lambda x: x

    def _build_vision_model(self):  # pragma: no cover - trivial
        import torchvision.models as models

        model = models.resnet18(weights=None)
        return model

    # -- Text processing --------------------------------------------------
    def translate_text(self, text: str, target_lang: str = "en") -> str:
        """Translate ``text`` to the target language.

        If a real translation model is not available the original text is
        returned unchanged.  ``target_lang`` is included for API completeness
        but only English is supported in the default implementation.
        """

        if not callable(self.translator):
            return text
        try:
            result = self.translator(text)
            if isinstance(result, list):
                # HuggingFace style
                return result[0]["translation_text"]
            return str(result)
        except Exception:
            return text

    def extract_entities(self, text: str, lang: str | None = None) -> List[str]:
        """Extract simple entities from ``text``.

        Non‑English input is translated before a very small regex‑based entity
        extractor is applied.  The extractor identifies capitalised tokens as
        named entities.
        """

        if lang and lang.lower() != "en":
            text = self.translate_text(text, "en")
        import re

        return [m.group(0) for m in re.finditer(r"\b[A-Z][a-zA-Z]+\b", text)]

    # -- Analytics --------------------------------------------------------
    def detect_anomalies(self, vectors: np.ndarray) -> np.ndarray:
        """Perform unsupervised anomaly detection on feature vectors."""

        model = IsolationForest(contamination=0.1, random_state=42)
        model.fit(vectors)
        return model.predict(vectors)

    def forecast_threats(self, counts: Iterable[float]) -> float:
        """Forecast the next value of a threat time series.

        A simple ``LinearRegression`` model is used.  The method returns the
        predicted next data point as a float.
        """

        y = np.array(list(counts), dtype=float)
        X = np.arange(len(y), dtype=float).reshape(-1, 1)
        reg = LinearRegression().fit(X, y)
        next_x = np.array([[len(y)]], dtype=float)
        return float(reg.predict(next_x)[0])

    # -- Vision -----------------------------------------------------------
    def analyse_image(self, image: torch.Tensor) -> torch.Tensor:
        """Run a forward pass of ``image`` through the vision model.

        Parameters
        ----------
        image: torch.Tensor
            Image tensor with shape ``(N, 3, 224, 224)``.
        """

        with torch.no_grad():
            logits = self.vision_model(image)
            return torch.softmax(logits, dim=1)
