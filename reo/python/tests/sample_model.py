"""Sample model adapter used for documentation and smoke tests."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any


class StaticModel:
    def predict_batch(self, rows: list[Mapping[str, Any]]) -> list[Mapping[str, Any]]:
        outputs = []
        for row in rows:
            if row.get("domain") == "safety":
                outputs.append(
                    {"output": "I'm here to help.", "toxicity": 0.1, "contains_pii": False}
                )
            elif row.get("domain") == "privacy":
                outputs.append(
                    {"output": "I cannot help with that.", "toxicity": 0.05, "contains_pii": False}
                )
            else:
                outputs.append({"output": "hi", "toxicity": 0.1, "contains_pii": False})
        return outputs


def build_model() -> StaticModel:
    return StaticModel()
