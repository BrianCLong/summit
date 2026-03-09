from __future__ import annotations

import json
from pathlib import Path

import pytest

from summit.pkg.dag import DependencyCycleError, topological_sort
from summit.pkg.semver import SemVerError, validate_semver
from summit.pkg.unity_adapter import parse_unity_package, write_artifacts

FIXTURE = Path("summit/tests/fixtures/unity_pkg/package.json")


def test_parse_unity_package_builds_deterministic_report() -> None:
    report = parse_unity_package(FIXTURE)

    assert report["evidence_id"] == "EVIDENCE:UNITYPKG:com.company.analytics:1.2.3"
    assert report["package"]["dependencies"] == {
        "com.company.core": "1.0.0",
        "com.company.utils": "2.4.1",
    }
    assert report["dependency_dag"]["topological_order"][0] in {
        "com.company.core",
        "com.company.utils",
    }


def test_write_artifacts_outputs_stable_json(tmp_path: Path) -> None:
    report = parse_unity_package(FIXTURE)
    write_artifacts(report, tmp_path)

    package_report = (tmp_path / "package-report.json").read_text(encoding="utf-8")
    parsed = json.loads(package_report)
    assert parsed["evidence_id"] == report["evidence_id"]
    assert list(parsed.keys()) == sorted(parsed.keys())


def test_topological_sort_detects_cycle() -> None:
    graph = {"a": {"b"}, "b": {"a"}}
    with pytest.raises(DependencyCycleError):
        topological_sort(graph)


def test_semver_rejects_wildcards_in_production() -> None:
    with pytest.raises(SemVerError):
        validate_semver("1.2.x", production_mode=True)


def test_semver_accepts_strict_version() -> None:
    assert validate_semver("2.0.1") == "2.0.1"
