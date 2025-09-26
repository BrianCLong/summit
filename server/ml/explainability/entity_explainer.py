"""Explainability utilities for entity recognition models.

This module provides a hybrid explainability engine that prefers LIME for
natural-language explanations, falls back to SHAP for feature-based
interpretability, and ultimately uses heuristic scoring when external
libraries or GPU-bound frameworks are unavailable. The goal is to supply a
stable JSON contract that the Node/GraphQL layer can consume regardless of
which ML runtime is active (PyTorch, TensorFlow, or simple heuristics).
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Callable, Dict, Iterable, List, Optional

logger = logging.getLogger(__name__)

try:  # Optional dependency
    import numpy as np

    NUMPY_AVAILABLE = True
except Exception:  # pragma: no cover - optional dependency guard
    NUMPY_AVAILABLE = False
    np = None  # type: ignore

try:  # Optional dependency for LIME explainability
    from lime.lime_text import LimeTextExplainer

    LIME_AVAILABLE = True
except Exception:  # pragma: no cover - optional dependency guard
    LimeTextExplainer = None  # type: ignore
    LIME_AVAILABLE = False

try:  # Optional dependency for SHAP explainability
    import shap

    SHAP_AVAILABLE = True
except Exception:  # pragma: no cover - optional dependency guard
    shap = None  # type: ignore
    SHAP_AVAILABLE = False

try:  # Optional deep learning backends
    import torch

    TORCH_AVAILABLE = True
except Exception:  # pragma: no cover - optional dependency guard
    torch = None  # type: ignore
    TORCH_AVAILABLE = False

try:
    import tensorflow as tf

    TENSORFLOW_AVAILABLE = True
except Exception:  # pragma: no cover - optional dependency guard
    tf = None  # type: ignore
    TENSORFLOW_AVAILABLE = False

CLASS_NAMES = ["PERSON", "ORGANIZATION", "LOCATION", "EVENT", "OTHER"]
TITLES = {"mr", "mrs", "ms", "dr", "prof", "sir", "madam"}
COMPANY_KEYWORDS = {"inc", "corp", "llc", "ltd", "company", "corporation"}
LOCATION_KEYWORDS = {
    "city",
    "county",
    "state",
    "province",
    "village",
    "town",
    "seattle",
    "denver",
    "boston",
    "washington",
    "paris",
    "london",
    "new",
    "york",
}
EVENT_KEYWORDS = {"summit", "conference", "meeting", "workshop", "briefing", "hearing"}


@dataclass
class EntityPayload:
    """Structured entity payload consumed by the explainability engine."""

    text: str
    label: str
    confidence: Optional[float] = None
    start: Optional[int] = None
    end: Optional[int] = None


class EntityExplanationEngine:
    """Explainability layer that orchestrates LIME/SHAP heuristics."""

    def __init__(
        self,
        model: Optional[Any] = None,
        *,
        framework: str = "pytorch",
        class_names: Optional[List[str]] = None,
        background_sampler: Optional[Callable[[int], Iterable[str]]] = None,
    ) -> None:
        self.model = model
        self.framework = framework.lower()
        self.class_names = class_names or CLASS_NAMES
        self.background_sampler = background_sampler
        self.last_used_method: str = "heuristic"
        self.feature_names = [
            "token_length",
            "capital_ratio",
            "digit_ratio",
            "contains_email",
            "company_keyword",
            "location_keyword",
            "event_keyword",
        ]

        if self.framework not in {"pytorch", "tensorflow", "heuristic"}:
            logger.warning("Unsupported framework '%s', defaulting to heuristic", self.framework)
            self.framework = "heuristic"

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def explain_entities(
        self,
        text: str,
        entities: List[Dict[str, Any]],
        *,
        method: Optional[str] = None,
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        """Generate explainability payload for extracted entities."""

        if not text:
            return []

        entity_payloads = [self._coerce_entity(e) for e in entities]
        chosen_method = self._select_method(method)
        self.last_used_method = chosen_method
        explanations: List[Dict[str, Any]] = []

        for entity in entity_payloads:
            context = self._extract_context(text, entity.start, entity.end)
            if chosen_method == "lime":
                weights = self._explain_with_lime(context, entity.label, top_k)
            elif chosen_method == "shap":
                weights = self._explain_with_shap(context, entity.label, top_k)
            else:
                weights = self._heuristic_feature_weights(context, entity.label, top_k)

            summary = self._build_summary(entity.label, weights)
            explanations.append(
                {
                    "entityText": entity.text,
                    "label": entity.label,
                    "confidence": entity.confidence,
                    "method": chosen_method,
                    "context": context,
                    "featureWeights": weights,
                    "summary": summary,
                }
            )

        return explanations

    # Convenience wrapper -------------------------------------------------
    def to_json(
        self,
        text: str,
        entities: List[Dict[str, Any]],
        *,
        method: Optional[str] = None,
        top_k: int = 5,
    ) -> str:
        payload = {
            "success": True,
            "generatedAt": datetime.utcnow().isoformat() + "Z",
            "usedMethod": self._select_method(method),
            "explanations": self.explain_entities(text, entities, method=method, top_k=top_k),
        }
        return json.dumps(payload)

    # ------------------------------------------------------------------
    # Explainability backends
    # ------------------------------------------------------------------
    def _select_method(self, requested: Optional[str]) -> str:
        requested_normalized = (requested or "auto").lower()
        if requested_normalized == "lime" and LIME_AVAILABLE:
            return "lime"
        if requested_normalized == "shap" and SHAP_AVAILABLE:
            return "shap"
        if requested_normalized not in {"auto", "lime", "shap"}:
            logger.warning("Unknown explainability method '%s', falling back to auto", requested)
        if LIME_AVAILABLE:
            return "lime"
        if SHAP_AVAILABLE:
            return "shap"
        return "heuristic"

    def _explain_with_lime(self, context: str, label: str, top_k: int) -> List[Dict[str, float]]:
        if not LIME_AVAILABLE or LimeTextExplainer is None:  # pragma: no cover - guarded path
            return self._heuristic_feature_weights(context, label, top_k)

        class_index = self._label_index(label)
        explainer = LimeTextExplainer(class_names=self.class_names)
        try:
            explanation = explainer.explain_instance(
                context,
                self._predict_proba,
                labels=[class_index],
                num_features=max(top_k, 6),
            )
            weights = explanation.as_list(label=class_index)
            return [
                {"feature": token, "weight": float(weight)}
                for token, weight in weights[:top_k]
            ]
        except Exception as exc:  # pragma: no cover - defensive fallback
            logger.warning("LIME explanation failed: %s", exc)
            return self._heuristic_feature_weights(context, label, top_k)

    def _explain_with_shap(self, context: str, label: str, top_k: int) -> List[Dict[str, float]]:
        if not SHAP_AVAILABLE or shap is None or not NUMPY_AVAILABLE:  # pragma: no cover - guard
            return self._heuristic_feature_weights(context, label, top_k)

        class_index = self._label_index(label)
        features = self._vectorize_text(context)
        background = self._background_features(len(features))

        try:
            explainer = shap.KernelExplainer(self._predict_from_features, background)
            shap_values = explainer.shap_values(features.reshape(1, -1), nsamples=50)
            class_values = shap_values[class_index][0]
            weights = [
                {"feature": self.feature_names[i], "weight": float(class_values[i])}
                for i in range(len(self.feature_names))
            ]
            weights.sort(key=lambda item: abs(item["weight"]), reverse=True)
            return weights[:top_k]
        except Exception as exc:  # pragma: no cover - defensive fallback
            logger.warning("SHAP explanation failed: %s", exc)
            return self._heuristic_feature_weights(context, label, top_k)

    def _heuristic_feature_weights(self, context: str, label: str, top_k: int) -> List[Dict[str, float]]:
        tokens = self._tokenize(context)
        scored: List[Dict[str, float]] = []
        label_lower = label.lower()

        for token in tokens:
            base_weight = 0.0
            cleaned = re.sub(r"[^\w@]", "", token)
            lower = cleaned.lower()

            if not cleaned:
                continue

            if label_lower == "person":
                if cleaned[:1].isupper():
                    base_weight += 0.35
                if lower in TITLES:
                    base_weight += 0.25
                if "@" in token:
                    base_weight += 0.15
            elif label_lower == "organization":
                if lower in COMPANY_KEYWORDS:
                    base_weight += 0.4
                if cleaned.endswith(('Inc', 'Corp', 'LLC')):
                    base_weight += 0.3
            elif label_lower == "location":
                if lower in LOCATION_KEYWORDS:
                    base_weight += 0.35
                if token.endswith(','):
                    base_weight += 0.1
            elif label_lower == "event":
                if lower in EVENT_KEYWORDS:
                    base_weight += 0.4
                if any(ch.isdigit() for ch in cleaned):
                    base_weight += 0.1

            if base_weight:
                scored.append({"feature": cleaned, "weight": round(base_weight, 4)})

        scored.sort(key=lambda item: abs(item["weight"]), reverse=True)
        return scored[:top_k] or [
            {"feature": tokens[0] if tokens else label, "weight": 0.1}
        ]

    # ------------------------------------------------------------------
    # Prediction helpers
    # ------------------------------------------------------------------
    def _predict_proba(self, texts: List[str]) -> List[List[float]]:
        if self.model is not None:
            return self._predict_with_model(texts)
        return self._heuristic_probabilities(texts)

    def _predict_with_model(self, texts: List[str]) -> List[List[float]]:
        feature_matrix = [self._vectorize_text(text) for text in texts]
        if NUMPY_AVAILABLE:
            matrix = np.stack(feature_matrix)
        else:  # pragma: no cover - extremely rare path
            matrix = feature_matrix

        if self.framework == "pytorch" and TORCH_AVAILABLE and torch is not None:
            tensor = torch.tensor(matrix, dtype=torch.float32)
            self.model.eval()
            with torch.no_grad():
                outputs = self.model(tensor)
            probabilities = self._softmax(outputs.detach().cpu().numpy())
            return probabilities.tolist()

        if self.framework == "tensorflow" and TENSORFLOW_AVAILABLE and tf is not None:
            tensor = tf.convert_to_tensor(matrix, dtype=tf.float32)
            outputs = self.model(tensor, training=False)
            probabilities = self._softmax(outputs.numpy())
            return probabilities.tolist()

        logger.warning(
            "Model provided but framework '%s' unavailable. Falling back to heuristics.",
            self.framework,
        )
        return self._heuristic_probabilities(texts)

    def _predict_from_features(self, matrix: Iterable[List[float]]):
        rows = list(matrix)
        if not rows:
            return []
        texts = [self._features_to_synthetic_text(row) for row in rows]
        return self._predict_proba(texts)

    def _heuristic_probabilities(self, texts: Iterable[str]) -> List[List[float]]:
        probabilities: List[List[float]] = []
        for text in texts:
            tokens = self._tokenize(text)
            scores = {label: 0.2 for label in self.class_names}
            tokens_lower = [t.lower() for t in tokens]

            scores["PERSON"] += sum(1 for t in tokens if t[:1].isupper()) * 0.05
            scores["PERSON"] += sum(1 for t in tokens_lower if t in TITLES) * 0.1
            scores["PERSON"] += 0.2 if any("@" in t for t in tokens) else 0.0

            scores["ORGANIZATION"] += sum(1 for t in tokens_lower if t in COMPANY_KEYWORDS) * 0.15
            scores["ORGANIZATION"] += 0.15 if any(t.endswith(('Inc', 'Corp', 'LLC')) for t in tokens) else 0.0

            scores["LOCATION"] += sum(1 for t in tokens_lower if t in LOCATION_KEYWORDS) * 0.15
            scores["LOCATION"] += 0.1 if any(t.endswith(',') for t in tokens) else 0.0

            scores["EVENT"] += sum(1 for t in tokens_lower if t in EVENT_KEYWORDS) * 0.2
            scores["EVENT"] += 0.05 if any(ch.isdigit() for ch in text) else 0.0

            total = sum(scores.values()) or 1.0
            probabilities.append([scores[label] / total for label in self.class_names])
        return probabilities

    # ------------------------------------------------------------------
    # Utility helpers
    # ------------------------------------------------------------------
    def _coerce_entity(self, entity: Dict[str, Any]) -> EntityPayload:
        return EntityPayload(
            text=str(entity.get("text", "")),
            label=str(entity.get("label", "OTHER")),
            confidence=self._safe_float(entity.get("confidence")),
            start=self._safe_int(entity.get("start")),
            end=self._safe_int(entity.get("end")),
        )

    def _label_index(self, label: str) -> int:
        try:
            return self.class_names.index(label.upper())
        except ValueError:
            return self.class_names.index("OTHER")

    def _vectorize_text(self, text: str):
        length = max(len(text.split()), 1)
        capital_ratio = sum(1 for token in text.split() if token[:1].isupper()) / length
        digit_ratio = sum(ch.isdigit() for ch in text) / max(len(text), 1)
        contains_email = 1.0 if "@" in text else 0.0
        company_keyword = 1.0 if any(k in text.lower() for k in COMPANY_KEYWORDS) else 0.0
        location_keyword = 1.0 if any(k in text.lower() for k in LOCATION_KEYWORDS) else 0.0
        event_keyword = 1.0 if any(k in text.lower() for k in EVENT_KEYWORDS) else 0.0

        values = [
            float(length),
            float(capital_ratio),
            float(digit_ratio),
            float(contains_email),
            float(company_keyword),
            float(location_keyword),
            float(event_keyword),
        ]
        if NUMPY_AVAILABLE:
            return np.array(values, dtype=float)
        return values  # pragma: no cover - fallback path

    def _background_features(self, feature_dim: int):
        if self.background_sampler:
            samples = list(self.background_sampler(feature_dim))
            if samples:
                return samples
        if NUMPY_AVAILABLE:
            return np.zeros((1, feature_dim), dtype=float)
        return [[0.0 for _ in range(feature_dim)]]  # pragma: no cover

    def _features_to_synthetic_text(self, row: List[float]) -> str:
        tokens = []
        approx_length = max(int(round(row[0])), 1)
        tokens.extend(["Name"] * min(approx_length, 3))
        if row[3] > 0.5:
            tokens.append("name@example.com")
        if row[4] > 0.5:
            tokens.append("Acme Inc")
        if row[5] > 0.5:
            tokens.append("Seattle")
        if row[6] > 0.5:
            tokens.append("Summit 2024")
        return " ".join(tokens) or "Entity"

    def _extract_context(self, text: str, start: Optional[int], end: Optional[int]) -> str:
        if start is None or end is None or start < 0 or end < 0 or end <= start:
            return text.strip()[:280]
        window = 80
        context_start = max(start - window, 0)
        context_end = min(end + window, len(text))
        snippet = text[context_start:context_end].strip()
        return snippet or text.strip()[:280]

    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r"[\w@]+", text)

    def _build_summary(self, label: str, weights: List[Dict[str, float]]) -> str:
        if not weights:
            return f"No strong indicators detected for {label}."
        top_features = ", ".join(
            f"{item['feature']} ({item['weight']:+.2f})" for item in weights[:3]
        )
        return f"Top indicators for {label}: {top_features}."

    @staticmethod
    def _softmax(logits: Any) -> Any:
        if not NUMPY_AVAILABLE:
            return logits  # pragma: no cover - fallback
        logits = np.array(logits, dtype=float)
        if logits.ndim == 1:
            logits = logits.reshape(1, -1)
        exp_values = np.exp(logits - np.max(logits, axis=-1, keepdims=True))
        return exp_values / np.sum(exp_values, axis=-1, keepdims=True)

    @staticmethod
    def _safe_float(value: Any) -> Optional[float]:
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _safe_int(value: Any) -> Optional[int]:
        try:
            return int(value)
        except (TypeError, ValueError):
            return None


def explain_entities(
    text: str,
    entities: List[Dict[str, Any]],
    *,
    method: Optional[str] = None,
    top_k: int = 5,
    framework: str = "pytorch",
) -> List[Dict[str, Any]]:
    """Module-level convenience wrapper used by CLI/tests."""

    engine = EntityExplanationEngine(framework=framework)
    return engine.explain_entities(text, entities, method=method, top_k=top_k)
