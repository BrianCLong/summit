import hashlib
import json
from pathlib import Path

from cpv import (
    build_population_map,
    evaluate_privacy,
    generate_violation_heatmap,
    plan_remediations,
)


FIXTURE_DIR = Path(__file__).resolve().parents[2] / "fixtures" / "cpv"
DATASET = json.loads((FIXTURE_DIR / "injected_privacy_violations.json").read_text())
QI_COLUMNS = ["zip", "age"]
SENSITIVE_COLUMNS = ["disease"]
K_THRESHOLD = 4
L_THRESHOLD = 2
T_THRESHOLD = 0.2
METRICS = ("total_variation", "hellinger")


def _evaluate(rows):
    return evaluate_privacy(
        rows,
        quasi_identifier_columns=QI_COLUMNS,
        sensitive_columns=SENSITIVE_COLUMNS,
        k_map_threshold=K_THRESHOLD,
        population_map=build_population_map(rows, QI_COLUMNS),
        l_diversity_threshold=L_THRESHOLD,
        t_closeness_threshold=T_THRESHOLD,
        t_closeness_metrics=METRICS,
    )


def test_detects_injected_privacy_violations():
    report = _evaluate(DATASET)

    assert len(report.k_map_violations) == 3
    violating_keys = {violation.quasi_identifier for violation in report.k_map_violations}
    assert {("12345", 34), ("54321", 52), ("11111", 28)} == violating_keys

    ldiv_keys = {
        (violation.quasi_identifier, violation.sensitive_attribute)
        for violation in report.l_diversity_violations
    }
    assert {
        (("12345", 34), "disease"),
        (("11111", 28), "disease"),
    } == ldiv_keys

    assert report.t_closeness_violations, "t-closeness violations should be detected"
    for violation in report.t_closeness_violations:
        assert violation.metric in METRICS
        assert violation.distance > T_THRESHOLD


def test_remediation_plan_restores_targets():
    report = _evaluate(DATASET)
    plan = plan_remediations(report, DATASET, generalization_value="*")
    remediated = plan.apply(DATASET)

    remediated_report = evaluate_privacy(
        remediated,
        quasi_identifier_columns=QI_COLUMNS,
        sensitive_columns=SENSITIVE_COLUMNS,
        k_map_threshold=K_THRESHOLD,
        population_map=build_population_map(remediated, QI_COLUMNS),
        l_diversity_threshold=L_THRESHOLD,
        t_closeness_threshold=T_THRESHOLD,
        t_closeness_metrics=METRICS,
    )
    assert not remediated_report.any_violations()


def test_reports_and_heatmaps_are_deterministic(tmp_path: Path):
    report = _evaluate(DATASET)

    first = report.to_bytes(seed=123)
    second = report.to_bytes(seed=123)
    assert first == second

    heatmap_path_1 = tmp_path / "heatmap1.svg"
    heatmap_path_2 = tmp_path / "heatmap2.svg"
    generate_violation_heatmap(report, "total_variation", heatmap_path_1, seed=42)
    generate_violation_heatmap(report, "total_variation", heatmap_path_2, seed=42)

    digest_1 = hashlib.sha256(heatmap_path_1.read_bytes()).hexdigest()
    digest_2 = hashlib.sha256(heatmap_path_2.read_bytes()).hexdigest()
    assert digest_1 == digest_2
    assert heatmap_path_1.read_text() == heatmap_path_2.read_text()
