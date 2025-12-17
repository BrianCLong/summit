from pathlib import Path
import unittest
from tempfile import TemporaryDirectory

from tools.determinism.diff import DeterminismChecker


class DeterminismCheckerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.checker = DeterminismChecker()

    def test_detects_timestamp_signatures(self) -> None:
        with TemporaryDirectory() as build1, TemporaryDirectory() as build2:
            root1 = Path(build1)
            root2 = Path(build2)
            (root1 / "dist").mkdir(parents=True)
            (root2 / "dist").mkdir(parents=True)

            (root1 / "dist" / "artifact.txt").write_text(
                "build at 2024-01-01T00:00:00Z\n", encoding="utf-8"
            )
            (root2 / "dist" / "artifact.txt").write_text(
                "build at 2024-02-02T00:00:00Z\n", encoding="utf-8"
            )

            comparison = self.checker.compare_artifacts(
                self.checker.scan_build_directory(root1),
                self.checker.scan_build_directory(root2),
            )

            artifact_detail = comparison["artifact_comparison"]["dist/artifact.txt"]
            self.assertFalse(comparison["identical"])
            self.assertIn(
                "timestamp", " ".join(artifact_detail.get("suspicions", []))
            )
            self.assertIn("dist/artifact.txt", comparison["nondeterministic_hints"])

    def test_detects_ordering_instability(self) -> None:
        with TemporaryDirectory() as build1, TemporaryDirectory() as build2:
            root1 = Path(build1)
            root2 = Path(build2)
            (root1 / "dist").mkdir(parents=True)
            (root2 / "dist").mkdir(parents=True)

            (root1 / "dist" / "list.txt").write_text(
                "alpha\nbeta\ngamma\n", encoding="utf-8"
            )
            (root2 / "dist" / "list.txt").write_text(
                "beta\nalpha\ngamma\n", encoding="utf-8"
            )

            comparison = self.checker.compare_artifacts(
                self.checker.scan_build_directory(root1),
                self.checker.scan_build_directory(root2),
            )

            artifact_detail = comparison["artifact_comparison"]["dist/list.txt"]
            self.assertFalse(comparison["identical"])
            self.assertIn(
                "ordering", " ".join(artifact_detail.get("suspicions", []))
            )


if __name__ == "__main__":
    unittest.main()
