"""CLI entrypoint for deterministic intel ingestion."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
PACKAGES_ROOT = REPO_ROOT / "packages"
if str(PACKAGES_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGES_ROOT))

from intel_ingest.evidence import SCHEMA_VERSION, EvidenceResult, run_ingestion


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Deterministic intel ingest")
    parser.add_argument("bundle", help="Path to a bundle directory or file")
    parser.add_argument("artifact_root", help="Root directory for artifacts")
    parser.add_argument("--source-name", default="demo")
    parser.add_argument("--schema-version", default=SCHEMA_VERSION)
    parser.add_argument("--publisher", default="unknown")
    parser.add_argument("--provenance-confidence", default="unknown")
    parser.add_argument(
        "--provenance-uri",
        default=None,
        help="Override provenance URI (defaults to file://<bundle>)",
    )
    parser.add_argument(
        "--code-version",
        default=os.getenv("GIT_SHA", "unknown"),
        help="Override code version (default: GIT_SHA env)",
    )
    parser.add_argument(
        "--determinism-check",
        action="store_true",
        help="Flag artifacts as part of determinism check",
    )
    parser.add_argument(
        "--emit-report-path",
        action="store_true",
        help="Emit only the report.json path for scripting",
    )
    return parser.parse_args()


def _run_ingest(args: argparse.Namespace) -> EvidenceResult:
    bundle_path = Path(args.bundle)
    artifact_root = Path(args.artifact_root)
    provenance_uri = args.provenance_uri or f"file://{args.bundle}"

    return run_ingestion(
        bundle_path,
        artifact_root,
        source_name=args.source_name,
        provenance_uri=provenance_uri,
        publisher=args.publisher,
        provenance_confidence=args.provenance_confidence,
        schema_version=args.schema_version,
        code_version=args.code_version,
        determinism_check=args.determinism_check,
    )


def main() -> int:
    args = _parse_args()
    result = _run_ingest(args)
    if args.emit_report_path:
        print(result.report_path)
    else:
        print(result.evidence_id)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
