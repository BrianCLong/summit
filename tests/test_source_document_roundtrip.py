from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
PACKAGES_ROOT = REPO_ROOT / "packages"
if str(PACKAGES_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGES_ROOT))

from intel_ingest.evidence import run_ingestion


def _sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def test_deterministic_report(tmp_path: Path) -> None:
    bundle = tmp_path / "bundle"
    bundle.mkdir()
    (bundle / "sample.txt").write_text("hello", encoding="utf-8")

    artifact_root = tmp_path / "artifacts"

    run1 = run_ingestion(
        bundle,
        artifact_root / "run1",
        source_name="demo",
        provenance_uri="file://bundle",
        determinism_check=True,
    )
    run2 = run_ingestion(
        bundle,
        artifact_root / "run2",
        source_name="demo",
        provenance_uri="file://bundle",
        determinism_check=True,
    )

    report1 = run1.report_path.read_text(encoding="utf-8")
    report2 = run2.report_path.read_text(encoding="utf-8")

    assert report1 == report2


def test_source_document_hashing(tmp_path: Path) -> None:
    bundle = tmp_path / "bundle"
    bundle.mkdir()
    sample_path = bundle / "sample.txt"
    sample_path.write_text("hello", encoding="utf-8")

    result = run_ingestion(
        bundle,
        tmp_path / "artifacts",
        source_name="demo",
        provenance_uri="file://bundle",
    )

    report = result.report_path.read_text(encoding="utf-8")
    assert _sha256_text("hello") in report
    assert re.search(r"evid\.threattrace\.v0\.1\.0\.[0-9a-f]{12}\.[0-9a-f]{12}", report)
