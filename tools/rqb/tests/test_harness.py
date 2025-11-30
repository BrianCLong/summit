from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tools.rqb import BenchmarkHarness, MLStubDetector, RegexDetector, export_scorecard
from tools.rqb.ci_gate import _assert_thresholds

BASELINE_PATH = Path(__file__).resolve().parents[1] / "baselines" / "regex.json"


def test_regex_detector_matches_baseline(tmp_path: Path) -> None:
    harness = BenchmarkHarness(seed=1337)
    result = harness.run(RegexDetector())
    export_scorecard(result, tmp_path / "regex.json")
    baseline_payload = json.loads(BASELINE_PATH.read_text(encoding="utf-8"))
    candidate_payload = json.loads((tmp_path / "regex.json").read_text(encoding="utf-8"))
    assert candidate_payload["summary"] == pytest.approx(baseline_payload["summary"], rel=1e-4, abs=1e-4)
    assert candidate_payload["confusion_matrix"] == baseline_payload["confusion_matrix"]


def test_ml_stub_detector_is_deterministic() -> None:
    harness = BenchmarkHarness(seed=42)
    first = harness.run(MLStubDetector())
    second = harness.run(MLStubDetector())
    assert first.summary == second.summary
    assert first.confusion_matrix == second.confusion_matrix


def test_ci_gate_blocks_regressions() -> None:
    baseline = json.loads(BASELINE_PATH.read_text(encoding="utf-8"))
    candidate = json.loads(BASELINE_PATH.read_text(encoding="utf-8"))
    candidate["summary"]["precision"] -= 0.02
    with pytest.raises(SystemExit):
        _assert_thresholds(baseline, candidate, ["precision"], max_drop=0.01)

    # Within tolerance passes
    candidate["summary"]["precision"] += 0.015
    _assert_thresholds(baseline, candidate, ["precision"], max_drop=0.01)


def test_ci_gate_requires_expected_metrics() -> None:
    baseline = json.loads(BASELINE_PATH.read_text(encoding="utf-8"))
    candidate = json.loads(BASELINE_PATH.read_text(encoding="utf-8"))
    candidate["summary"].pop("precision", None)
    with pytest.raises(SystemExit):
        _assert_thresholds(baseline, candidate, ["precision"], max_drop=0.01)


def test_ci_gate_validates_numeric_values() -> None:
    baseline = json.loads(BASELINE_PATH.read_text(encoding="utf-8"))
    candidate = json.loads(BASELINE_PATH.read_text(encoding="utf-8"))
    candidate["summary"]["precision"] = "not-a-number"
    with pytest.raises(SystemExit):
        _assert_thresholds(baseline, candidate, ["precision"], max_drop=0.01)
