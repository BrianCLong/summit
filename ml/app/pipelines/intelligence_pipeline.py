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

from collections.abc import Callable, Iterable
from dataclasses import dataclass, field

import numpy as np
import torch
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import Ridge
from sklearn.model_selection import GridSearchCV


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

    translator: Callable | None = None
    vision_model: torch.nn.Module | None = None
    alert_callbacks: list[Callable[[float], None]] = field(default_factory=list)

    _forecast_model: Ridge | None = field(default=None, init=False)
    _model_version: int = field(default=0, init=False)
    _last_prediction: float | None = field(default=None, init=False)
    _error_history: list[float] = field(default_factory=list, init=False)
    _training_series: list[float] = field(default_factory=list, init=False)

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
        try:
            import torchvision.models as models

            return models.resnet18(weights=None)
        except Exception:
            return torch.nn.Sequential(
                torch.nn.Flatten(),
                torch.nn.Linear(3 * 224 * 224, 1000),
            )

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

    def extract_entities(self, text: str, lang: str | None = None) -> list[str]:
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

        Uses ridge regression with a small hyperparameter search to improve
        accuracy. The trained model and recent series are cached for
        potential retraining.
        """

        y = np.array(list(counts), dtype=float)
        X = np.arange(len(y), dtype=float).reshape(-1, 1)
        params = {"alpha": [0.1, 1.0, 10.0]}
        search = GridSearchCV(Ridge(), params, cv=3)
        search.fit(X, y)
        self._forecast_model = search.best_estimator_
        self._model_version += 1
        self._training_series = y.tolist()
        next_x = np.array([[len(y)]], dtype=float)
        pred = float(self._forecast_model.predict(next_x)[0])
        self._last_prediction = pred
        return pred

    def add_alert_callback(self, callback: Callable[[float], None]) -> None:
        """Register a callback for forecast-based alerts."""

        self.alert_callbacks.append(callback)

    def forecast_and_alert(self, counts: Iterable[float], threshold: float) -> float:
        """Forecast threats and trigger alerts when threshold exceeded."""

        prediction = self.forecast_threats(counts)
        if prediction >= threshold:
            for cb in self.alert_callbacks:
                cb(prediction)
        return prediction

    def update_forecast_performance(
        self,
        actual: float,
        window: int = 5,
        degrade_threshold: float = 10.0,
    ) -> None:
        """Update forecast model with actual observation.

        When the mean absolute error over ``window`` points exceeds
        ``degrade_threshold`` the model is retrained.
        """

        if self._last_prediction is None:
            return
        error = abs(actual - self._last_prediction)
        self._error_history.append(error)
        self._training_series.append(actual)
        if (
            len(self._error_history) >= window
            and np.mean(self._error_history[-window:]) > degrade_threshold
        ):
            self._retrain_forecast_model()
            self._error_history.clear()

    def _retrain_forecast_model(self) -> None:
        """Retrain the forecasting model using accumulated series."""

        if len(self._training_series) < 2:
            return
        y = np.array(self._training_series, dtype=float)
        X = np.arange(len(y), dtype=float).reshape(-1, 1)
        params = {"alpha": [0.1, 1.0, 10.0]}
        search = GridSearchCV(Ridge(), params, cv=3)
        search.fit(X, y)
        self._forecast_model = search.best_estimator_
        self._model_version += 1

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
