from __future__ import annotations

import json
from pathlib import Path


def test_vitals_schema_weights_sum_to_one() -> None:
    schema_path = Path("evaluation/vitals/schema.yaml")
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    total = round(sum(float(item["weight"]) for item in schema.values()), 6)
    assert total == 1.0


def test_vitals_schema_has_expected_dimensions() -> None:
    schema_path = Path("evaluation/vitals/schema.yaml")
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    assert sorted(schema.keys()) == [
        "accuracy",
        "cost_per_1k_tokens",
        "latency_ms",
        "robustness",
        "safety_score",
    ]
