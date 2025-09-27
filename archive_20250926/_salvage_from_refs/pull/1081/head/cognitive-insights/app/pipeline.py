from __future__ import annotations

from functools import lru_cache

from langdetect import LangDetectException, detect  # type: ignore[import-untyped]

from .backends.base import BaseNLPBackend
from .backends.huggingface_backend import HuggingFaceBackend
from .backends.onnx_backend import ONNXRuntimeBackend
from .config import get_settings
from .redact import redact
from .schemas import AnalysisResult, BiasIndicator, TextItem

_BACKENDS = {
    "hf": HuggingFaceBackend,
    "onnx": ONNXRuntimeBackend,
}


@lru_cache
def _get_backend() -> BaseNLPBackend:
    settings = get_settings()
    backend_cls = _BACKENDS.get(settings.backend, HuggingFaceBackend)
    return backend_cls()


def detect_language(text: str) -> str:
    try:
        return detect(text)
    except LangDetectException:
        return "unknown"


def _derive_bias(cues: dict[str, float]) -> list[BiasIndicator]:
    indicators: list[BiasIndicator] = []
    if cues.get("absolutist_terms", 0) > 0:
        indicators.append(
            BiasIndicator(type="absolutist_phrasing", confidence=cues["absolutist_terms"])
        )
    if cues.get("confirmation_bias"):
        indicators.append(
            BiasIndicator(type="confirmation_framing", confidence=cues["confirmation_bias"])
        )
    if not indicators:
        indicators.append(BiasIndicator(type="balanced_language", confidence=0.0))
    return indicators


def analyze_batch(items: list[TextItem]) -> list[AnalysisResult]:
    backend = _get_backend()
    texts = [redact(i.text) for i in items]
    raw_results = backend.predict(texts, lang=None)
    results: list[AnalysisResult] = []
    for item, res in zip(items, raw_results, strict=False):
        language = item.lang or res.get("language") or detect_language(item.text)
        cues = res.get("cues", {})
        bias_indicators = _derive_bias(cues)
        safety = [
            "invite counter-evidence respectfully",
            "add source citations for key claims",
        ]
        if cues.get("absolutist_terms", 0) > 0.3:
            safety.append("avoid absolutist phrasing to reduce polarization")
        results.append(
            AnalysisResult(
                item_id=item.id,
                language=language,
                sentiment=res["sentiment"],
                emotion=res["emotion"],
                bias_indicators=bias_indicators,
                toxicity=res["toxicity"],
                safety_guidance=safety,
                policy_flags=[],
            )
        )
    return results


__all__ = ["analyze_batch", "detect_language"]
