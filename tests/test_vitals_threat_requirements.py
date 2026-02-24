from __future__ import annotations

import json
from pathlib import Path

import pytest

from evaluation.vitals.generate_report import EvalConfig, run_evaluation


BASE_CONFIG = EvalConfig(
    schema_path=Path("evaluation/vitals/schema.yaml"),
    corpus_path=Path("evaluation/vitals/benchmark_corpus.jsonl"),
    fixtures_path=Path("evaluation/vitals/provider_fixtures.json"),
    out_dir=Path("artifacts/llm-vitals-test"),
    baseline_path=Path("evaluation/vitals/baseline_metrics.json"),
    selected_models=[],
    max_regression=0.05,
    expected_corpus_sha=None,
)


def test_corpus_hash_mismatch_fails(tmp_path: Path) -> None:
    config = EvalConfig(**{**BASE_CONFIG.__dict__, "out_dir": tmp_path / "run", "expected_corpus_sha": "deadbeef"})
    with pytest.raises(ValueError, match="Corpus hash mismatch"):
        run_evaluation(config)


def test_missing_metrics_denied(tmp_path: Path) -> None:
    fixtures = json.loads(BASE_CONFIG.fixtures_path.read_text(encoding="utf-8"))
    fixtures["providers"][0]["responses"] = fixtures["providers"][0]["responses"][:-1]

    broken = tmp_path / "fixtures_missing_case.json"
    broken.write_text(json.dumps(fixtures, indent=2) + "\n", encoding="utf-8")

    config = EvalConfig(**{**BASE_CONFIG.__dict__, "out_dir": tmp_path / "run", "fixtures_path": broken})
    with pytest.raises(ValueError, match="Missing metrics"):
        run_evaluation(config)


def test_seed_validation_fails_on_non_int(tmp_path: Path) -> None:
    fixtures = json.loads(BASE_CONFIG.fixtures_path.read_text(encoding="utf-8"))
    fixtures["providers"][0]["seed"] = "nondeterministic"

    broken = tmp_path / "fixtures_bad_seed.json"
    broken.write_text(json.dumps(fixtures, indent=2) + "\n", encoding="utf-8")

    config = EvalConfig(**{**BASE_CONFIG.__dict__, "out_dir": tmp_path / "run", "fixtures_path": broken})
    with pytest.raises(ValueError, match="Seed validation failed"):
        run_evaluation(config)
