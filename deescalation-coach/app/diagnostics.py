"""Text diagnostics for tone and safety."""

from __future__ import annotations

import re
from typing import Any, Dict, Mapping
from langdetect import detect

ABSOLUTIST = {"always", "never", "everyone", "no", "none", "undeniable", "destroyed"}
POSITIVE = {"good", "great", "happy", "love"}
NEGATIVE = {"bad", "terrible", "hate", "angry"}
EMOTION_WORDS = {
    "anger": {"angry", "furious"},
    "fear": {"scared", "fear"},
    "sadness": {"sad", "down"},
    "joy": {"happy", "joy"},
    "surprise": {"surprised"},
    "disgust": {"disgust"},
}
TOXIC = {"idiot", "stupid", "hate"}


def _distribution(counts: Mapping[str, float | int]) -> Dict[str, float]:
    total = sum(counts.values()) or 1.0
    return {k: v / total for k, v in counts.items()}


def analyze_text(text: str) -> Dict[str, Any]:
    words = re.findall(r"\b\w+\b", text.lower())
    sentiment_counts = {
        "positive": sum(w in POSITIVE for w in words),
        "negative": sum(w in NEGATIVE for w in words),
        "neutral": 1,  # baseline to avoid zero
    }
    emotion_counts = {k: sum(w in v for w in words) + 1 for k, v in EMOTION_WORDS.items()}
    toxicity_score = sum(w in TOXIC for w in words) / (len(words) or 1)
    absolutist_score = sum(w in ABSOLUTIST for w in words) / (len(words) or 1)
    letters = re.findall(r"[A-Za-z]", text)
    caps_ratio = sum(1 for ch in letters if ch.isupper()) / len(letters) if letters else 0.0
    return {
        "sentiment": _distribution(sentiment_counts),
        "emotion": _distribution(emotion_counts),
        "toxicity": {"score": toxicity_score},
        "absolutist_score": absolutist_score,
        "caps_ratio": caps_ratio,
        "lang": detect(text) if text.strip() else "en",
    }


__all__ = ["analyze_text"]
