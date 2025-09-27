"""Pytest plugin exposing fixtures for the Pipeline Flakiness Detector."""
from __future__ import annotations

import os
from dataclasses import replace
from typing import Iterable, List, Optional

import pytest

from .core import PipelineFlakinessDetector, PipelineStep, StepAnalysis
from .report import HTMLReportBuilder


class PFDSession:
    """Holds flakiness analyses across a pytest session."""

    def __init__(self, runs: int, threshold: float, report_path: str) -> None:
        self.runs = runs
        self.threshold = threshold
        self.report_path = os.path.abspath(report_path)
        self._records: List[StepAnalysis] = []

    def run_pipeline(
        self,
        steps: Iterable[PipelineStep],
        *,
        initial_input: object = None,
        seed: int = 0,
        set_seeds: bool = True,
        name: Optional[str] = None,
    ) -> List[StepAnalysis]:
        detector = PipelineFlakinessDetector(
            list(steps),
            runs=self.runs,
            seed=seed,
            threshold=self.threshold,
            set_seeds=set_seeds,
        )
        analyses = detector.run(initial_input=initial_input)
        label = name or "pipeline"
        for analysis in analyses:
            prefixed = replace(analysis, name=f"{label}::{analysis.name}")
            self._records.append(prefixed)
        return analyses

    def finalize(self) -> None:
        if not self.report_path:
            return
        os.makedirs(os.path.dirname(self.report_path) or ".", exist_ok=True)
        builder = HTMLReportBuilder(
            self._records,
            runs=self.runs,
            threshold=self.threshold,
            title="Pipeline Flakiness Report",
        )
        builder.to_file(self.report_path)


def pytest_addoption(parser: pytest.Parser) -> None:
    group = parser.getgroup("pfd")
    group.addoption(
        "--pfd-runs",
        action="store",
        default=5,
        type=int,
        help="Number of executions per pipeline for the flakiness detector.",
    )
    group.addoption(
        "--pfd-threshold",
        action="store",
        default=0.2,
        type=float,
        help="Flakiness score threshold to flag steps.",
    )
    group.addoption(
        "--pfd-report",
        action="store",
        default="pfd-report.html",
        help="Path to the generated HTML report.",
    )


def pytest_configure(config: pytest.Config) -> None:
    runs = int(config.getoption("--pfd-runs"))
    threshold = float(config.getoption("--pfd-threshold"))
    report_path = str(config.getoption("--pfd-report"))
    session = PFDSession(runs=runs, threshold=threshold, report_path=report_path)
    config._pfd_session = session  # type: ignore[attr-defined]


@pytest.fixture
def pfd_session(request: pytest.FixtureRequest) -> PFDSession:
    return request.config._pfd_session  # type: ignore[attr-defined]


def pytest_unconfigure(config: pytest.Config) -> None:
    session: Optional[PFDSession] = getattr(config, "_pfd_session", None)
    if session is not None:
        session.finalize()


__all__ = ["PFDSession"]
