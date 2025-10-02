from __future__ import annotations

import random
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from pfd.core import PipelineFlakinessDetector, PipelineStep
from pfd.report import HTMLReportBuilder
from pfd.pytest_plugin import PFDSession


def deterministic_step(value: int | None) -> int:
    return (value or 0) + 1


def nondeterministic_step(value: int) -> float:
    return value + random.SystemRandom().random()


def test_detector_flags_nondeterministic_step(tmp_path: Path) -> None:
    steps = [
        PipelineStep("increment", deterministic_step),
        PipelineStep("jitter", nondeterministic_step),
    ]
    detector = PipelineFlakinessDetector(steps, runs=6, seed=42)
    analyses = detector.run(initial_input=1)
    increment, jitter = analyses
    assert increment.flakiness_score == 0.0
    assert increment.difference_ratio == 0.0
    assert jitter.flakiness_score >= 0.85
    assert jitter.difference_ratio >= 0.8
    assert jitter.flagged


def test_html_report_reproducible(tmp_path: Path) -> None:
    steps = [PipelineStep("increment", deterministic_step)]
    detector = PipelineFlakinessDetector(steps, runs=4, seed=123)
    analyses = detector.run(initial_input=2)
    builder = HTMLReportBuilder(analyses, runs=detector.runs, threshold=detector.threshold)
    report_a = builder.build()
    report_b = builder.build()
    assert report_a == report_b
    output = tmp_path / "report.html"
    builder.to_file(output.as_posix())
    assert output.read_text(encoding="utf-8") == report_a


def test_pfd_session_generates_prefixed_report(tmp_path: Path) -> None:
    session = PFDSession(runs=4, threshold=0.2, report_path=tmp_path / "session.html")
    steps = [PipelineStep("increment", deterministic_step)]
    session.run_pipeline(steps, initial_input=0, name="demo")
    session.finalize()
    report_text = (tmp_path / "session.html").read_text(encoding="utf-8")
    assert "demo::increment" in report_text
