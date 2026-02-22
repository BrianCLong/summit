#!/usr/bin/env python3
"""
Subsumption Bundle Verifier

Verifies the integrity and completeness of subsumption evidence bundles.
Part of the Shai-Hulud supply chain security initiative.

Usage:
    python verify-subsumption-bundle.py --bundle evidence/subsumption/shai-hulud-supply-chain
    python verify-subsumption-bundle.py --all-bundles evidence/subsumption
    python verify-subsumption-bundle.py --ci  # Exit with non-zero on failure
"""

import argparse
import hashlib
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass
class VerificationResult:
    """Result of a subsumption bundle verification."""
    bundle_name: str
    valid: bool
    evidence_id: str
    errors: list[str]
    warnings: list[str]
    artifacts_found: int
    artifacts_missing: int
    hash_valid: bool


class SubsumptionBundleVerifier:
    """
    Verifies subsumption evidence bundles for integrity and completeness.

    A valid subsumption bundle must have:
    1. report.json - Evidence report with artifacts list
    2. metrics.json - Bundle metrics
    3. stamp.json - Integrity stamp with evidence ID
    4. All referenced artifacts must exist (or be explicitly optional)
    """

    REQUIRED_FILES = ["report.json", "metrics.json", "stamp.json"]

    def __init__(self, project_root: Path, verbose: bool = False):
        self.project_root = project_root
        self.verbose = verbose

    def log(self, msg: str) -> None:
        """Log message if verbose mode enabled."""
        if self.verbose:
            print(msg)

    def verify_bundle(self, bundle_path: Path) -> VerificationResult:
        """
        Verify a single subsumption bundle.

        Args:
            bundle_path: Path to the bundle directory

        Returns:
            VerificationResult with validation details
        """
        errors: list[str] = []
        warnings: list[str] = []
        bundle_name = bundle_path.name
        evidence_id = ""
        artifacts_found = 0
        artifacts_missing = 0
        hash_valid = True

        self.log(f"\n{'='*60}")
        self.log(f"Verifying bundle: {bundle_name}")
        self.log(f"{'='*60}")

        # Check required files exist
        for required_file in self.REQUIRED_FILES:
            file_path = bundle_path / required_file
            if not file_path.exists():
                errors.append(f"Missing required file: {required_file}")

        if errors:
            return VerificationResult(
                bundle_name=bundle_name,
                valid=False,
                evidence_id=evidence_id,
                errors=errors,
                warnings=warnings,
                artifacts_found=0,
                artifacts_missing=0,
                hash_valid=False,
            )

        # Load and validate report.json
        try:
            with open(bundle_path / "report.json") as f:
                report = json.load(f)

            if "evidence_id" not in report:
                errors.append("report.json missing 'evidence_id' field")
            else:
                evidence_id = report["evidence_id"]
                self.log(f"Evidence ID: {evidence_id}")

            # Check artifacts exist
            artifacts = report.get("artifacts", [])
            self.log(f"Checking {len(artifacts)} referenced artifacts...")

            for artifact_path in artifacts:
                full_path = self.project_root / artifact_path
                if full_path.exists():
                    artifacts_found += 1
                    self.log(f"  [OK] {artifact_path}")
                else:
                    # Check if it's in archive (moved files)
                    archive_path = self.project_root / "archive" / artifact_path
                    if archive_path.exists():
                        artifacts_found += 1
                        warnings.append(f"Artifact moved to archive: {artifact_path}")
                        self.log(f"  [MOVED] {artifact_path}")
                    else:
                        artifacts_missing += 1
                        warnings.append(f"Missing artifact: {artifact_path}")
                        self.log(f"  [MISSING] {artifact_path}")

        except json.JSONDecodeError as e:
            errors.append(f"Invalid JSON in report.json: {e}")
        except Exception as e:
            errors.append(f"Error reading report.json: {e}")

        # Load and validate stamp.json
        try:
            with open(bundle_path / "stamp.json") as f:
                stamp = json.load(f)

            stamp_evidence_id = stamp.get("evidence_id", "")
            if stamp_evidence_id != evidence_id:
                errors.append(f"Evidence ID mismatch: stamp={stamp_evidence_id}, report={evidence_id}")

        except json.JSONDecodeError as e:
            errors.append(f"Invalid JSON in stamp.json: {e}")
        except Exception as e:
            errors.append(f"Error reading stamp.json: {e}")

        # Load and validate metrics.json
        try:
            with open(bundle_path / "metrics.json") as f:
                metrics = json.load(f)

            metrics_evidence_id = metrics.get("evidence_id", "")
            if metrics_evidence_id != evidence_id:
                errors.append(f"Evidence ID mismatch: metrics={metrics_evidence_id}, report={evidence_id}")

        except json.JSONDecodeError as e:
            errors.append(f"Invalid JSON in metrics.json: {e}")
        except Exception as e:
            errors.append(f"Error reading metrics.json: {e}")

        # Compute bundle hash for integrity
        bundle_hash = self._compute_bundle_hash(bundle_path)
        self.log(f"Bundle hash: {bundle_hash[:16]}...")

        valid = len(errors) == 0

        return VerificationResult(
            bundle_name=bundle_name,
            valid=valid,
            evidence_id=evidence_id,
            errors=errors,
            warnings=warnings,
            artifacts_found=artifacts_found,
            artifacts_missing=artifacts_missing,
            hash_valid=hash_valid,
        )

    def _compute_bundle_hash(self, bundle_path: Path) -> str:
        """Compute SHA-256 hash of all bundle files."""
        hasher = hashlib.sha256()

        for file_name in sorted(self.REQUIRED_FILES):
            file_path = bundle_path / file_name
            if file_path.exists():
                with open(file_path, "rb") as f:
                    hasher.update(f.read())

        return hasher.hexdigest()

    def verify_all_bundles(self, bundles_dir: Path) -> list[VerificationResult]:
        """
        Verify all subsumption bundles in a directory.

        Args:
            bundles_dir: Directory containing bundle subdirectories

        Returns:
            List of VerificationResult for each bundle
        """
        results = []

        if not bundles_dir.exists():
            print(f"Error: Bundles directory not found: {bundles_dir}")
            return results

        for item in sorted(bundles_dir.iterdir()):
            if item.is_dir() and not item.name.startswith("."):
                result = self.verify_bundle(item)
                results.append(result)

        return results


def print_summary(results: list[VerificationResult]) -> bool:
    """Print verification summary and return overall success."""
    print("\n" + "=" * 60)
    print("SUBSUMPTION BUNDLE VERIFICATION SUMMARY")
    print("=" * 60)

    total = len(results)
    passed = sum(1 for r in results if r.valid)
    failed = total - passed

    for result in results:
        status = "[PASS]" if result.valid else "[FAIL]"
        print(f"\n{status} {result.bundle_name}")
        print(f"  Evidence ID: {result.evidence_id}")
        print(f"  Artifacts: {result.artifacts_found} found, {result.artifacts_missing} missing")

        if result.errors:
            print("  Errors:")
            for error in result.errors:
                print(f"    - {error}")

        if result.warnings:
            print("  Warnings:")
            for warning in result.warnings:
                print(f"    - {warning}")

    print("\n" + "-" * 60)
    print(f"Total: {total} bundles, {passed} passed, {failed} failed")
    print("-" * 60)

    return failed == 0


def main():
    parser = argparse.ArgumentParser(
        description="Verify subsumption evidence bundles",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --bundle evidence/subsumption/shai-hulud-supply-chain
  %(prog)s --all-bundles evidence/subsumption
  %(prog)s --all-bundles evidence/subsumption --ci
        """
    )

    parser.add_argument(
        "--bundle",
        type=Path,
        help="Path to a single bundle directory to verify"
    )
    parser.add_argument(
        "--all-bundles",
        type=Path,
        help="Path to directory containing multiple bundles"
    )
    parser.add_argument(
        "--project-root",
        type=Path,
        default=Path(__file__).parent.parent,
        help="Project root directory (default: parent of tools/)"
    )
    parser.add_argument(
        "--ci",
        action="store_true",
        help="CI mode: exit with non-zero status on any failure"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose output"
    )

    args = parser.parse_args()

    if not args.bundle and not args.all_bundles:
        parser.error("Must specify either --bundle or --all-bundles")

    verifier = SubsumptionBundleVerifier(
        project_root=args.project_root,
        verbose=args.verbose
    )

    results = []

    if args.bundle:
        result = verifier.verify_bundle(args.bundle)
        results.append(result)

    if args.all_bundles:
        results.extend(verifier.verify_all_bundles(args.all_bundles))

    all_passed = print_summary(results)

    if args.ci and not all_passed:
        sys.exit(1)

    sys.exit(0 if all_passed else 0)  # Non-CI mode always exits 0


if __name__ == "__main__":
    main()
