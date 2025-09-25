"""Feature engineering helpers used by the ER classifier and explanations."""

from __future__ import annotations

from collections import OrderedDict
from difflib import SequenceMatcher
from typing import Iterable

from .models import Entity


def _normalize(value: str) -> str:
    return value.strip().lower()


def tokenize(entity: Entity) -> list[str]:
    tokens: list[str] = []
    tokens.extend(_normalize(entity.name).split())
    for key, value in sorted(entity.attributes.items()):
        if isinstance(value, str):
            tokens.extend(_normalize(value).split())
        elif isinstance(value, Iterable) and not isinstance(value, (bytes, bytearray)):
            tokens.extend(_normalize(str(v)) for v in value)
    tokens.append(_normalize(entity.type))
    return [t for t in tokens if t]


class FeatureEngineer:
    """Produces deterministic feature vectors for a pair of entities."""

    FEATURE_ORDER = (
        "name_jaccard",
        "name_similarity",
        "token_overlap",
        "email_exact",
        "type_match",
        "attribute_overlap",
    )

    def _jaccard(self, a_tokens: set[str], b_tokens: set[str]) -> float:
        if not a_tokens and not b_tokens:
            return 1.0
        if not a_tokens or not b_tokens:
            return 0.0
        return len(a_tokens & b_tokens) / len(a_tokens | b_tokens)

    def _token_overlap_ratio(self, a_tokens: set[str], b_tokens: set[str]) -> float:
        if not a_tokens and not b_tokens:
            return 1.0
        if not a_tokens or not b_tokens:
            return 0.0
        return min(len(a_tokens & b_tokens) / len(a_tokens), len(a_tokens & b_tokens) / len(b_tokens))

    def _attribute_overlap(self, entity_a: Entity, entity_b: Entity) -> float:
        keys = set(entity_a.attributes.keys()) | set(entity_b.attributes.keys())
        if not keys:
            return 0.0
        matches = 0
        for key in keys:
            a_val = entity_a.attributes.get(key)
            b_val = entity_b.attributes.get(key)
            if isinstance(a_val, str) and isinstance(b_val, str):
                if _normalize(a_val) == _normalize(b_val):
                    matches += 1
            elif a_val == b_val and a_val is not None:
                matches += 1
        return matches / len(keys)

    def compute(self, entity_a: Entity, entity_b: Entity) -> dict[str, float]:
        a_tokens = set(tokenize(entity_a))
        b_tokens = set(tokenize(entity_b))

        name_similarity = SequenceMatcher(None, _normalize(entity_a.name), _normalize(entity_b.name)).ratio()
        email_exact = float(
            _normalize(entity_a.attributes.get("email", ""))
            == _normalize(entity_b.attributes.get("email", ""))
            and entity_a.attributes.get("email") is not None
        )
        type_match = float(_normalize(entity_a.type) == _normalize(entity_b.type))
        attribute_overlap = self._attribute_overlap(entity_a, entity_b)

        features: OrderedDict[str, float] = OrderedDict()
        features["name_jaccard"] = self._jaccard(a_tokens, b_tokens)
        features["name_similarity"] = name_similarity
        features["token_overlap"] = self._token_overlap_ratio(a_tokens, b_tokens)
        features["email_exact"] = email_exact
        features["type_match"] = type_match
        features["attribute_overlap"] = attribute_overlap

        return OrderedDict((feature, float(features[feature])) for feature in self.FEATURE_ORDER)
