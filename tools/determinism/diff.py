#!/usr/bin/env python3
"""
Deterministic Build Verification Tool
Sprint 27C: Cross-runner reproducibility enforcement
"""

import argparse
import hashlib
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass
class BuildArtifact:
    """Represents a build artifact with metadata"""

    path: str
    hash: str
    size: int
    timestamp: str | None = None


@dataclass
class SBOMComparison:
    """SBOM comparison result"""

    identical: bool
    differences: list[str]
    normalized_hash_1: str
    normalized_hash_2: str


class DeterminismChecker:
    """Verifies build determinism across runners"""

    def __init__(self):
        # Fields to ignore when comparing (timestamps, etc)
        self.ignore_patterns = [
            r'"timestamp":\s*"[^"]*"',
            r'"buildDate":\s*"[^"]*"',
            r'"created":\s*"[^"]*"',
            r'"serialNumber":\s*"[^"]*"',
            r'"documentId":\s*"[^"]*"',
            r'"creationInfo":\s*\{[^}]*"created"[^}]*\}',
            # Docker image IDs and timestamps
            r'"Id":\s*"sha256:[a-f0-9]{64}"',
            r'"Created":\s*"[^"]*"',
            # Build tool specific timestamps
            r'"npm_audit_report_timestamp":\s*[0-9]+',
            r'"build_timestamp":\s*[0-9]+',
        ]

        # Compile regex patterns for performance
        self.compiled_patterns = [re.compile(pattern) for pattern in self.ignore_patterns]

    def normalize_json(self, content: str) -> str:
        """Normalize JSON by removing non-deterministic fields"""
        normalized = content

        # Remove ignored patterns
        for pattern in self.compiled_patterns:
            normalized = pattern.sub('""', normalized)

        # Parse and re-serialize to normalize formatting
        try:
            parsed = json.loads(normalized)
            # Sort keys recursively for consistent ordering
            normalized = json.dumps(parsed, sort_keys=True, separators=(",", ":"))
        except json.JSONDecodeError:
            # If not valid JSON, return as-is
            pass

        return normalized

    def hash_file(self, file_path: Path) -> str:
        """Calculate SHA256 hash of a file"""
        hasher = hashlib.sha256()
        try:
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hasher.update(chunk)
            return hasher.hexdigest()
        except FileNotFoundError:
            return ""

    def hash_normalized_content(self, content: str) -> str:
        """Calculate hash of normalized content"""
        normalized = self.normalize_json(content)
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    def compare_sboms(self, sbom1_path: Path, sbom2_path: Path) -> SBOMComparison:
        """Compare two SBOM files with normalization"""
        try:
            with open(sbom1_path) as f:
                content1 = f.read()
            with open(sbom2_path) as f:
                content2 = f.read()
        except FileNotFoundError as e:
            return SBOMComparison(
                identical=False,
                differences=[f"File not found: {e}"],
                normalized_hash_1="",
                normalized_hash_2="",
            )

        # Normalize both SBOMs
        normalized1 = self.normalize_json(content1)
        normalized2 = self.normalize_json(content2)

        # Calculate hashes
        hash1 = self.hash_normalized_content(content1)
        hash2 = self.hash_normalized_content(content2)

        identical = hash1 == hash2
        differences = []

        if not identical:
            differences = self._find_sbom_differences(content1, content2)

        return SBOMComparison(
            identical=identical,
            differences=differences,
            normalized_hash_1=hash1,
            normalized_hash_2=hash2,
        )

    def _find_sbom_differences(self, content1: str, content2: str) -> list[str]:
        """Find specific differences between SBOM contents"""
        differences = []

        try:
            sbom1 = json.loads(content1)
            sbom2 = json.loads(content2)

            # Compare component counts
            components1 = sbom1.get("components", [])
            components2 = sbom2.get("components", [])

            if len(components1) != len(components2):
                differences.append(
                    f"Component count mismatch: {len(components1)} vs {len(components2)}"
                )

            # Compare component names and versions
            comp_names1 = {c.get("name", "") for c in components1}
            comp_names2 = {c.get("name", "") for c in components2}

            missing_in_2 = comp_names1 - comp_names2
            missing_in_1 = comp_names2 - comp_names1

            if missing_in_2:
                differences.append(f"Components in build1 but not build2: {missing_in_2}")
            if missing_in_1:
                differences.append(f"Components in build2 but not build1: {missing_in_1}")

        except json.JSONDecodeError:
            differences.append("Unable to parse SBOM as JSON for detailed comparison")

        return differences

    def compare_artifacts(
        self, artifacts1: list[BuildArtifact], artifacts2: list[BuildArtifact]
    ) -> dict[str, Any]:
        """Compare two sets of build artifacts"""
        result = {"identical": True, "differences": [], "artifact_comparison": {}}

        # Create lookup dictionaries
        artifacts1_dict = {art.path: art for art in artifacts1}
        artifacts2_dict = {art.path: art for art in artifacts2}

        all_paths = set(artifacts1_dict.keys()) | set(artifacts2_dict.keys())

        for path in sorted(all_paths):
            art1 = artifacts1_dict.get(path)
            art2 = artifacts2_dict.get(path)

            comparison = {"path": path}

            if art1 is None:
                comparison["status"] = "missing_in_build1"
                result["identical"] = False
                result["differences"].append(f"Missing in build1: {path}")
            elif art2 is None:
                comparison["status"] = "missing_in_build2"
                result["identical"] = False
                result["differences"].append(f"Missing in build2: {path}")
            elif art1.hash != art2.hash:
                comparison["status"] = "hash_mismatch"
                comparison["hash1"] = art1.hash
                comparison["hash2"] = art2.hash
                comparison["size1"] = art1.size
                comparison["size2"] = art2.size
                result["identical"] = False
                result["differences"].append(
                    f"Hash mismatch for {path}: {art1.hash[:12]}... vs {art2.hash[:12]}..."
                )
            else:
                comparison["status"] = "identical"
                comparison["hash"] = art1.hash

            result["artifact_comparison"][path] = comparison

        return result

    def scan_build_directory(self, build_dir: Path) -> list[BuildArtifact]:
        """Scan build directory and collect artifacts"""
        artifacts = []

        # Common artifact patterns
        artifact_patterns = [
            "dist/**/*",
            "build/**/*",
            "*.tgz",
            "*.tar.gz",
            "*.sbom.json",
            "*.sbom.spdx.json",
            "*.sbom.cdx.json",
        ]

        for pattern in artifact_patterns:
            for file_path in build_dir.glob(pattern):
                if file_path.is_file():
                    artifacts.append(
                        BuildArtifact(
                            path=str(file_path.relative_to(build_dir)),
                            hash=self.hash_file(file_path),
                            size=file_path.stat().st_size,
                        )
                    )

        return artifacts


def main():
    parser = argparse.ArgumentParser(description="Verify build determinism across runners")
    parser.add_argument("build1", help="Path to first build directory or manifest")
    parser.add_argument("build2", help="Path to second build directory or manifest")
    parser.add_argument("--sbom1", help="Path to first SBOM file")
    parser.add_argument("--sbom2", help="Path to second SBOM file")
    parser.add_argument("--output", help="Output file for detailed report")
    parser.add_argument(
        "--fail-on-diff", action="store_true", help="Exit with code 1 if differences found"
    )

    args = parser.parse_args()

    checker = DeterminismChecker()

    # Determine if inputs are directories or manifest files
    build1_path = Path(args.build1)
    build2_path = Path(args.build2)

    if build1_path.is_dir() and build2_path.is_dir():
        # Scan directories
        print("🔍 Scanning build directories...")
        artifacts1 = checker.scan_build_directory(build1_path)
        artifacts2 = checker.scan_build_directory(build2_path)

        print(f"Found {len(artifacts1)} artifacts in build1, {len(artifacts2)} in build2")

    else:
        # Load from manifest files
        print("📋 Loading artifact manifests...")
        try:
            with open(build1_path) as f:
                manifest1 = json.load(f)
            with open(build2_path) as f:
                manifest2 = json.load(f)

            artifacts1 = [BuildArtifact(**art) for art in manifest1.get("artifacts", [])]
            artifacts2 = [BuildArtifact(**art) for art in manifest2.get("artifacts", [])]

        except (FileNotFoundError, json.JSONDecodeError, KeyError) as e:
            print(f"❌ Error loading manifests: {e}")
            sys.exit(1)

    # Compare artifacts
    print("🔄 Comparing build artifacts...")
    comparison = checker.compare_artifacts(artifacts1, artifacts2)

    # Compare SBOMs if provided
    sbom_comparison = None
    if args.sbom1 and args.sbom2:
        print("📄 Comparing SBOMs...")
        sbom_comparison = checker.compare_sboms(Path(args.sbom1), Path(args.sbom2))

    # Generate report
    report = {
        "determinism_check": {
            "timestamp": "2025-09-19T00:00:00Z",
            "build1_path": str(build1_path),
            "build2_path": str(build2_path),
            "artifact_comparison": comparison,
            "sbom_comparison": sbom_comparison.__dict__ if sbom_comparison else None,
        }
    }

    # Output results
    if comparison["identical"] and (not sbom_comparison or sbom_comparison.identical):
        print("✅ Build determinism verified: All artifacts identical")
        exit_code = 0
    else:
        print("❌ Build determinism failed: Differences detected")
        print("\nDifferences:")
        for diff in comparison["differences"]:
            print(f"  - {diff}")

        if sbom_comparison and not sbom_comparison.identical:
            print("\nSBOM differences:")
            for diff in sbom_comparison.differences:
                print(f"  - {diff}")

        exit_code = 1 if args.fail_on_diff else 0

    # Save detailed report
    if args.output:
        with open(args.output, "w") as f:
            json.dump(report, f, indent=2)
        print(f"📊 Detailed report saved to {args.output}")

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
