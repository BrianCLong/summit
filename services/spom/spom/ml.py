"""Lightweight embedding stub for semantic similarity."""

from __future__ import annotations

import math
import re
from collections import Counter
from typing import Dict, Iterable, Tuple


_TOKEN_PATTERN = re.compile(r"[a-z0-9]+")


class EmbeddingModel:
    """Deterministic embedding stub used for scoring."""

    def __init__(self) -> None:
        self.ontology_space: Dict[str, Counter[str]] = {
            "EMAIL": Counter({"email": 2, "mail": 1, "contact": 1, "inbox": 1}),
            "PHONE": Counter({"phone": 2, "mobile": 1, "sms": 1, "dial": 1}),
            "NAME": Counter({"name": 2, "fullname": 1, "first": 1, "last": 1}),
            "ADDRESS": Counter({"address": 2, "street": 1, "city": 1, "postal": 1}),
            "IP": Counter({"ip": 2, "address": 1, "network": 1, "client": 1}),
            "GOV_ID": Counter({"government": 1, "id": 2, "ssn": 2, "passport": 1}),
            "ACCESS_TOKEN": Counter({"token": 2, "session": 1, "auth": 1, "bearer": 1}),
            "API_KEY": Counter({"api": 2, "key": 2, "secret": 1, "integration": 1}),
            "PAYMENT_HINTS": Counter({"payment": 1, "card": 2, "iban": 1, "account": 1}),
        }

    def tokenize(self, text: str) -> Counter[str]:
        tokens = _TOKEN_PATTERN.findall(text.lower())
        return Counter(tokens)

    def embed(self, text: str) -> Counter[str]:
        return self.tokenize(text)

    def similarity(self, text: str, category: str) -> float:
        if category not in self.ontology_space:
            return 0.0
        a = self.embed(text)
        b = self.ontology_space[category]
        if not a or not b:
            return 0.0
        dot = sum(min(a[token], b[token]) for token in a.keys() & b.keys())
        norm_a = math.sqrt(sum(v * v for v in a.values()))
        norm_b = math.sqrt(sum(v * v for v in b.values()))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    def best_category(self, text: str, candidates: Iterable[str]) -> Tuple[str | None, float]:
        best_category: str | None = None
        best_score = 0.0
        for category in candidates:
            score = self.similarity(text, category)
            if score > best_score:
                best_category = category
                best_score = score
        return best_category, best_score
