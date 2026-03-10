from __future__ import annotations

import json
from pathlib import Path

import pytest

from summit.pkg.dag import DependencyCycleError, topological_sort
from summit.pkg.semver import SemVerError, validate_semver
from summit.pkg.unity_adapter import build_package_report

FIXTURE_MANIFEST = Path("summit/tests/fixtures/unity_pkg/package.json")


def test_build_package_report_is_deterministic() -> None:
    policy = {
        "allowed_scopes": ["com.company.*"],
        "blocked_registries": ["http://"],
        "enforce_https": True,
    }

    report1, metrics1, stamp1 = build_package_report(FIXTURE_MANIFEST, policy)
    report2, metrics2, stamp2 = build_package_report(FIXTURE_MANIFEST, policy)

    assert report1 == report2
    assert metrics1 == metrics2
    assert stamp1 == stamp2
    assert report1["evidence_id"] == "EVIDENCE:UNITYPKG:com.company.demo:1.2.3"
    assert report1["topological_sort"][0] == "com.company.demo"


def test_semver_rejects_wildcard() -> None:
    with pytest.raises(SemVerError):
        validate_semver("1.2.*")


def test_cycle_detection_raises() -> None:
    dag = {
        "a": ["b"],
        "b": ["a"],
    }
    with pytest.raises(DependencyCycleError):
        topological_sort(dag)


def test_cli_artifact_schema(tmp_path: Path) -> None:
    policy = {
        "allowed_scopes": ["com.company.*"],
        "blocked_registries": ["http://"],
        "enforce_https": True,
    }
    report, metrics, stamp = build_package_report(FIXTURE_MANIFEST, policy)

    out = tmp_path / "artifacts"
    out.mkdir()
    (out / "package-report.json").write_text(json.dumps(report, sort_keys=True), encoding="utf-8")
    (out / "metrics.json").write_text(json.dumps(metrics, sort_keys=True), encoding="utf-8")
    (out / "stamp.json").write_text(json.dumps(stamp, sort_keys=True), encoding="utf-8")

    assert (out / "package-report.json").exists()
    assert json.loads((out / "package-report.json").read_text(encoding="utf-8"))["package"]["name"] == "com.company.demo"
