from __future__ import annotations

import re
from typing import List

from .base import BaseNLPBackend, NLPResult


_POSITIVE = {"good", "great", "love", "happy", "excellent", "awesome"}
_NEGATIVE = {
    "bad",
    "terrible",
    "hate",
    "awful",
    "delay",
    "lying",
    "lies",
    "liar",
}
_ABSOLUTIST = {
    "always",
    "never",
    "everyone",
    "nobody",
    "all",
    "none",
    "must",
    "forever",
}


class HuggingFaceBackend(BaseNLPBackend):
    """Deterministic rule-based backend used for tests."""

    def warmup(self) -> None:  # pragma: no cover - nothing heavy to load
        pass

    def predict(self, texts: List[str], lang: str | None) -> List[NLPResult]:
        results: List[NLPResult] = []
        for text in texts:
            language = lang or "en"
            words = re.findall(r"\b\w+\b", text.lower())
            total = len(words) or 1

            pos = sum(w in _POSITIVE for w in words)
            neg = sum(w in _NEGATIVE for w in words)
            neu = total - pos - neg
            denom = pos + neg + neu or 1
            sentiment = {
                "positive": pos / denom,
                "neutral": neu / denom,
                "negative": neg / denom,
            }

            exclaim = text.count("!")
            question = text.count("?")
            anger = neg + exclaim
            joy = pos
            sadness = words.count("delay") + words.count("sad")
            fear = words.count("fear") + words.count("worry")
            surprise = question
            disgust = words.count("gross")
            other = 1
            emotion_raw = {
                "anger": anger,
                "fear": fear,
                "sadness": sadness,
                "joy": joy,
                "surprise": surprise,
                "disgust": disgust,
                "other": other,
            }
            e_total = sum(emotion_raw.values()) or 1
            emotion = {k: v / e_total for k, v in emotion_raw.items()}

            tox = neg / (neg + pos + 1)
            toxicity = {"toxic": tox, "non_toxic": 1 - tox}

            abs_count = sum(w in _ABSOLUTIST for w in words)
            cues = {"absolutist_terms": abs_count / total}
            if "true" in words:
                cues["confirmation_bias"] = 0.8
            results.append(
                NLPResult(
                    language=language,
                    sentiment=sentiment,
                    emotion=emotion,
                    toxicity=toxicity,
                    cues=cues,
                )
            )
        return results
