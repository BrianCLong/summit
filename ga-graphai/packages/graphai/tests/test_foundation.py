import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "src"))
from foundation import (  # type: ignore  # noqa: E402
    EvaluationWindow,
    GraphFoundationModelBenchmarker,
    GraphFoundationModelProfile,
)


def test_gfm_benchmarker_reports_lift():
    profile = GraphFoundationModelProfile(
        name="iohunter",
        embedding_dim=512,
        latency_ms=120,
        max_nodes=200000,
        specialties=("influence-detection",),
    )
    benchmarker = GraphFoundationModelBenchmarker(profile)
    baseline = [
        EvaluationWindow(precision=0.8, recall=0.7, f1=0.75, roc_auc=0.78),
        EvaluationWindow(precision=0.79, recall=0.72, f1=0.75, roc_auc=0.8),
    ]
    candidate = [
        EvaluationWindow(precision=0.84, recall=0.78, f1=0.8, roc_auc=0.85),
        EvaluationWindow(precision=0.85, recall=0.79, f1=0.81, roc_auc=0.86),
    ]
    comparison = benchmarker.compare(baseline, candidate)
    assert comparison.lift_precision > 0
    assert comparison.candidate.precision >= comparison.baseline.precision
