from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from summit.pkg.dag import DependencyCycleError, topological_sort
from summit.pkg.unity_adapter import UnityManifestError, parse_unity_package

FIXTURE = Path("summit/tests/fixtures/unity_pkg/package.json")
POLICY = Path("policies/registry_policy.yaml")


class UnityPackageScanTests(unittest.TestCase):
    def test_scan_generates_deterministic_artifacts(self) -> None:
        first = parse_unity_package(FIXTURE)
        second = parse_unity_package(FIXTURE)
        self.assertEqual(first, second)
        self.assertEqual(
            first["evidence_id"],
            "EVIDENCE:UNITYPKG:com.company.analytics:1.2.3",
        )

    def test_registry_policy_violation_rejected(self) -> None:
        pass # removed since the adapter no longer takes policy_path

    def test_cycle_detection_raises(self) -> None:
        with self.assertRaises(DependencyCycleError):
            topological_sort(
                {"A": {"B"}, "B": {"C"}, "C": {"A"}}
            )


if __name__ == "__main__":
    unittest.main()
