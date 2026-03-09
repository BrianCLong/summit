from __future__ import annotations

import json
from pathlib import Path

import pytest

from summit.pkg.dag import DependencyCycleError, topological_sort
from summit.pkg.semver import SemVerError, validate_semver
from summit.pkg.unity_adapter import parse_unity_package, write_artifacts

FIXTURE_MANIFEST = Path("summit/tests/fixtures/unity_pkg/package.json")


def test_build_package_report_is_deterministic() -> None:
    report1 = parse_unity_package(FIXTURE_MANIFEST)
    report2 = parse_unity_package(FIXTURE_MANIFEST)

    assert report1 == report2
    assert report1["evidence_id"] == "EVIDENCE:UNITYPKG:com.company.analytics:1.2.3"
    assert report1["dependency_dag"]["topological_order"][0] in ("com.company.core", "com.company.utils")


def test_semver_rejects_wildcard() -> None:
    with pytest.raises(SemVerError):
        validate_semver("1.2.*", production_mode=True)


def test_cycle_detection_raises() -> None:
    dag = {
        "a": {"b"},
        "b": {"a"},
    }
    with pytest.raises(DependencyCycleError):
        topological_sort(dag)


def test_cli_artifact_schema(tmp_path: Path) -> None:
    report = parse_unity_package(FIXTURE_MANIFEST)

    out = tmp_path / "artifacts"
    write_artifacts(report, out)

    assert (out / "package-report.json").exists()
    assert json.loads((out / "package-report.json").read_text(encoding="utf-8"))["package"]["name"] == "com.company.analytics"
