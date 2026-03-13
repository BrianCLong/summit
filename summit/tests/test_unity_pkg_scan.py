import json
from pathlib import Path

import pytest

from summit.pkg.dag import DependencyCycleError, topological_sort
from summit.pkg.semver import SemVerError, validate_semver
from summit.pkg.unity_adapter import parse_unity_package

FIXTURE_MANIFEST = Path("summit/tests/fixtures/unity_pkg/package.json")

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
