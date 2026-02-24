from __future__ import annotations

from pathlib import Path

from evaluation.vitals.generate_report import EvalConfig, run_evaluation


def _run(out_dir: Path) -> None:
    run_evaluation(
        EvalConfig(
            schema_path=Path("evaluation/vitals/schema.yaml"),
            corpus_path=Path("evaluation/vitals/benchmark_corpus.jsonl"),
            fixtures_path=Path("evaluation/vitals/provider_fixtures.json"),
            out_dir=out_dir,
            baseline_path=Path("evaluation/vitals/baseline_metrics.json"),
            selected_models=[],
            max_regression=0.05,
            expected_corpus_sha=None,
        )
    )


def test_vitals_outputs_are_deterministic(tmp_path: Path) -> None:
    out_a = tmp_path / "run_a"
    out_b = tmp_path / "run_b"
    _run(out_a)
    _run(out_b)

    assert (out_a / "report.json").read_text(encoding="utf-8") == (out_b / "report.json").read_text(
        encoding="utf-8"
    )
    assert (out_a / "metrics.json").read_text(encoding="utf-8") == (out_b / "metrics.json").read_text(
        encoding="utf-8"
    )
    assert (out_a / "stamp.json").read_text(encoding="utf-8") == (out_b / "stamp.json").read_text(
        encoding="utf-8"
    )
