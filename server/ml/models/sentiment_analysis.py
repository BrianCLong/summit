"""Sentiment analysis utilities for the Summit ML engine.

This module provides a light-weight wrapper around Hugging Face sentiment
classification models with a deterministic lexical fallback.  It can be used as
an importable library or executed directly from the command line.  The command
line interface is intentionally simple so that Node.js services (such as the
feed processor) can invoke the script and receive JSON responses.
"""

from __future__ import annotations

import argparse
import base64
import json
import logging
import sys
from datetime import datetime, timezone
from typing import Callable, Dict, Iterable, List, Optional, Sequence


logger = logging.getLogger(__name__)

try:  # pragma: no cover - optional dependency
    from transformers import pipeline as hf_pipeline  # type: ignore

    TRANSFORMERS_AVAILABLE = True
except Exception:  # pragma: no cover - environment without transformers
    hf_pipeline = None  # type: ignore
    TRANSFORMERS_AVAILABLE = False


ScoreDistribution = Dict[str, float]
PipelineCallable = Callable[[str], Sequence[Dict[str, float]]]


class SentimentModel:
    """Sentiment classifier with optional Hugging Face integration."""

    DEFAULT_MODEL = "cardiffnlp/twitter-roberta-base-sentiment-latest"

    def __init__(
        self,
        model_name: str = DEFAULT_MODEL,
        pipeline_factory: Optional[Callable[[str], PipelineCallable]] = None,
        max_length: int = 512,
    ) -> None:
        self.model_name = model_name
        self.max_length = max_length
        self._pipeline: Optional[PipelineCallable] = None
        self._mode = "lexicon-rule"

        if pipeline_factory is None and TRANSFORMERS_AVAILABLE:
            pipeline_factory = self._default_pipeline_factory

        if pipeline_factory is not None:
            try:
                self._pipeline = pipeline_factory(model_name)
                self._mode = "transformer"
            except Exception as exc:  # pragma: no cover - defensive guard
                logger.warning("Falling back to lexical sentiment due to %s", exc)
                self._pipeline = None

    @staticmethod
    def _default_pipeline_factory(model_name: str) -> PipelineCallable:
        if not TRANSFORMERS_AVAILABLE:  # pragma: no cover - guard
            raise RuntimeError("transformers library is not installed")

        hf = hf_pipeline(  # type: ignore[operator]
            "sentiment-analysis",
            model=model_name,
            return_all_scores=True,
        )

        def _call(text: str) -> Sequence[Dict[str, float]]:
            result = hf(text)
            if isinstance(result, Sequence) and result and isinstance(result[0], Sequence):
                return result[0]  # pipeline returns List[List[Dict]] for batched calls
            return result  # type: ignore[return-value]

        return _call

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def analyze_text(
        self,
        text: str,
        *,
        metadata: Optional[Dict[str, str]] = None,
    ) -> Dict[str, object]:
        """Analyse a single text string and return a normalized payload."""

        if not text or not text.strip():
            return self._empty_result(metadata)

        prepared = text.strip()
        if len(prepared) > self.max_length:
            prepared = prepared[: self.max_length]

        if self._pipeline is not None:
            try:
                raw_predictions = self._pipeline(prepared)
                return self._format_transformer_result(raw_predictions, prepared, metadata)
            except Exception as exc:  # pragma: no cover - defensive guard
                logger.exception("Transformer sentiment analysis failed: %s", exc)

        return self._lexical_analysis(prepared, metadata)

    def analyze_batch(
        self,
        texts: Iterable[str],
        *,
        metadata: Optional[Iterable[Optional[Dict[str, str]]]] = None,
    ) -> List[Dict[str, object]]:
        """Analyse multiple texts sequentially."""

        results: List[Dict[str, object]] = []
        metadata_iter = iter(metadata) if metadata is not None else None

        for text in texts:
            meta = next(metadata_iter) if metadata_iter is not None else None
            results.append(self.analyze_text(text, metadata=meta))

        return results

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _format_transformer_result(
        self,
        predictions: Sequence[Dict[str, float]],
        text: str,
        metadata: Optional[Dict[str, str]],
    ) -> Dict[str, object]:
        label_map = {
            "LABEL_0": "negative",
            "LABEL_1": "neutral",
            "LABEL_2": "positive",
            "NEGATIVE": "negative",
            "NEUTRAL": "neutral",
            "POSITIVE": "positive",
        }

        probabilities: ScoreDistribution = {}
        best_label = "neutral"
        best_confidence = 0.0

        for entry in predictions:
            raw_label = str(entry.get("label", "neutral"))
            label = label_map.get(raw_label.upper(), raw_label.lower())
            score = float(entry.get("score", 0.0))
            probabilities[label] = score
            if score > best_confidence:
                best_label = label
                best_confidence = score

        signed_score = self._to_signed_score(best_label, best_confidence)
        return self._build_payload(
            label=best_label,
            confidence=best_confidence,
            signed_score=signed_score,
            method=self._mode,
            text=text,
            metadata=metadata,
            probabilities=probabilities,
        )

    def _lexical_analysis(
        self,
        text: str,
        metadata: Optional[Dict[str, str]],
    ) -> Dict[str, object]:
        text_lower = text.lower()
        positive_tokens = {
            "excellent",
            "good",
            "great",
            "love",
            "positive",
            "outstanding",
            "success",
            "happy",
            "wonderful",
        }
        negative_tokens = {
            "bad",
            "terrible",
            "awful",
            "negative",
            "sad",
            "hate",
            "poor",
            "failure",
            "horrible",
        }

        positive_hits = sum(1 for token in positive_tokens if token in text_lower)
        negative_hits = sum(1 for token in negative_tokens if token in text_lower)

        if positive_hits > negative_hits:
            label = "positive"
            confidence = min(0.95, 0.55 + 0.1 * positive_hits)
        elif negative_hits > positive_hits:
            label = "negative"
            confidence = min(0.95, 0.55 + 0.1 * negative_hits)
        else:
            label = "neutral"
            confidence = 0.6

        signed_score = self._to_signed_score(label, confidence)
        probabilities = self._probability_distribution(label, confidence)

        return self._build_payload(
            label=label,
            confidence=confidence,
            signed_score=signed_score,
            method="lexicon-rule",
            text=text,
            metadata=metadata,
            probabilities=probabilities,
        )

    def _empty_result(self, metadata: Optional[Dict[str, str]]) -> Dict[str, object]:
        return self._build_payload(
            label="neutral",
            confidence=0.0,
            signed_score=0.0,
            method=self._mode,
            text="",
            metadata=metadata,
            probabilities={"neutral": 1.0},
        )

    def _build_payload(
        self,
        *,
        label: str,
        confidence: float,
        signed_score: float,
        method: str,
        text: str,
        metadata: Optional[Dict[str, str]],
        probabilities: ScoreDistribution,
    ) -> Dict[str, object]:
        timestamp = datetime.now(timezone.utc).isoformat()
        token_count = len(text.split()) if text else 0
        payload = {
            "label": label,
            "confidence": round(float(confidence), 6),
            "score": round(float(signed_score), 6),
            "method": method,
            "model": self.model_name if method == "transformer" else "lexicon-rule",
            "probabilities": probabilities,
            "token_count": token_count,
            "text_sample": text[:240],
            "computed_at": timestamp,
        }

        if metadata:
            payload["metadata"] = metadata

        return payload

    @staticmethod
    def _to_signed_score(label: str, confidence: float) -> float:
        if label == "positive":
            return confidence
        if label == "negative":
            return -confidence
        return 0.0

    @staticmethod
    def _probability_distribution(label: str, confidence: float) -> ScoreDistribution:
        neutral_weight = max(0.0, 1.0 - confidence)
        if label == "positive":
            return {
                "positive": confidence,
                "neutral": neutral_weight * 0.7,
                "negative": neutral_weight * 0.3,
            }
        if label == "negative":
            return {
                "negative": confidence,
                "neutral": neutral_weight * 0.7,
                "positive": neutral_weight * 0.3,
            }
        return {
            "neutral": max(confidence, 0.5),
            "positive": (1.0 - confidence) * 0.25,
            "negative": (1.0 - confidence) * 0.25,
        }


# ----------------------------------------------------------------------
# Command line interface
# ----------------------------------------------------------------------


def _decode_base64(value: str) -> str:
    return base64.b64decode(value.encode("utf-8")).decode("utf-8")


def _load_json_metadata(value: Optional[str]) -> Optional[Dict[str, str]]:
    if not value:
        return None
    try:
        data = json.loads(value)
    except json.JSONDecodeError as exc:  # pragma: no cover - CLI guard
        raise ValueError(f"Invalid metadata JSON: {exc}") from exc

    if data is None:
        return None
    if not isinstance(data, dict):  # pragma: no cover - CLI guard
        raise ValueError("Metadata must be a JSON object")

    # Cast everything to strings to keep payload predictable
    return {str(key): str(value) for key, value in data.items()}


def _load_batch_file(path: str) -> List[str]:
    with open(path, "r", encoding="utf-8") as handle:
        payload = json.load(handle)

    if isinstance(payload, list):
        return [str(item) for item in payload]

    raise ValueError("Batch file must contain a JSON array of strings")


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Sentiment analysis CLI")
    parser.add_argument("--text-base64", dest="text_base64", help="UTF-8 text encoded in base64")
    parser.add_argument("--input-file", dest="input_file", help="JSON file containing an array of texts")
    parser.add_argument("--model-name", dest="model_name", default=SentimentModel.DEFAULT_MODEL)
    parser.add_argument("--metadata", dest="metadata", help="JSON metadata to attach to the response")

    args = parser.parse_args(argv)

    if not args.text_base64 and not args.input_file:
        parser.error("Either --text-base64 or --input-file must be provided")

    model = SentimentModel(model_name=args.model_name)

    try:
        if args.input_file:
            texts = _load_batch_file(args.input_file)
            results = model.analyze_batch(texts)
            print(json.dumps(results, ensure_ascii=False))
            return 0

        assert args.text_base64 is not None
        text = _decode_base64(args.text_base64)
        metadata = _load_json_metadata(args.metadata)
        result = model.analyze_text(text, metadata=metadata)
        print(json.dumps(result, ensure_ascii=False))
        return 0

    except Exception as exc:  # pragma: no cover - CLI guard
        logger.error("Sentiment analysis failed: %s", exc)
        print(json.dumps({"error": str(exc)}))
        return 1


if __name__ == "__main__":  # pragma: no cover - CLI execution
    sys.exit(main())

