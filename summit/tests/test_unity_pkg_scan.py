from __future__ import annotations

import json
from pathlib import Path

import pytest

from summit.pkg.dag import DependencyCycleError, topological_sort
from summit.pkg.semver import SemVerError, validate_semver
from summit.pkg.unity_adapter import parse_unity_package


FIXTURE_MANIFEST = Path("summit/tests/fixtures/unity_pkg/package.json")


def test_parse_unity_package_is_deterministic() -> None:
    # Ensure fixture exists
    if not FIXTURE_MANIFEST.exists():
        pytest.skip(f"Fixture {FIXTURE_MANIFEST} not found")

    report1 = parse_unity_package(FIXTURE_MANIFEST)
    report2 = parse_unity_package(FIXTURE_MANIFEST)

    assert report1 == report2
    assert report1["evidence_id"] == "EVIDENCE:UNITYPKG:com.company.analytics:1.2.3"
    assert report1["dependency_dag"]["topological_order"][0] == "com.company.analytics"


def test_semver_rejects_wildcard() -> None:
    with pytest.raises(SemVerError):
        validate_semver("1.2.*")


def test_cycle_detection_raises() -> None:
    dag = {
        "a": {"b"},
        "b": {"a"},
    }
    with pytest.raises(DependencyCycleError):
        topological_sort(dag)


def test_cli_artifact_schema(tmp_path: Path) -> None:
    if not FIXTURE_MANIFEST.exists():
        pytest.skip(f"Fixture {FIXTURE_MANIFEST} not found")

    report = parse_unity_package(FIXTURE_MANIFEST)

    out = tmp_path / "artifacts"
    out.mkdir()
    (out / "package-report.json").write_text(json.dumps(report, sort_keys=True), encoding="utf-8")

    assert (out / "package-report.json").exists()
    assert json.loads((out / "package-report.json").read_text(encoding="utf-8"))["package"]["name"] == "com.company.analytics"
