from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


def _run_pipeline(tmp_path: Path, fixture: str, enrichment: str | None) -> Path:
    output_dir = tmp_path / "out"
    args = [
        sys.executable,
        "tools/research/raschka2025h2_pipeline.py",
        "--input",
        fixture,
        "--output-dir",
        str(output_dir),
    ]
    if enrichment:
        args.extend(["--enrichment", enrichment])
    subprocess.run(args, check=True)
    return output_dir


def test_pipeline_ingests_and_scores(tmp_path: Path) -> None:
    fixture = "tests/fixtures/raschka2025h2_sample.md"
    enrichment = "tests/fixtures/raschka2025h2_enrichment.json"
    output_dir = _run_pipeline(tmp_path, fixture, enrichment)

    papers = json.loads((output_dir / "papers.json").read_text())
    assert papers["access_status"] == "ingested"
    assert sum(len(cat["papers"]) for cat in papers["categories"]) == 3

    backlog_csv = (output_dir / "backlog.csv").read_text()
    assert "paper-alpha-training-reasoners" in backlog_csv
    assert "P0" in backlog_csv or "P1" in backlog_csv


def test_pipeline_deferred_without_enrichment(tmp_path: Path) -> None:
    fixture = "tests/fixtures/raschka2025h2_sample.md"
    output_dir = _run_pipeline(tmp_path, fixture, None)

    backlog_csv = (output_dir / "backlog.csv").read_text()
    assert "deferred-pending-enrichment" in backlog_csv
