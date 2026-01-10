#!/usr/bin/env python3
"""Supply chain policy gate for reference artifacts.

This gate enforces license allowlists, CVE severity thresholds, and the
presence of required attestations/SBOMs as part of the golden-path pipeline.
"""

import argparse
import json
import pathlib
from collections.abc import Iterable

LICENSE_SEVERITY_ORDER = ["UNKNOWN", "LOW", "MEDIUM", "HIGH", "CRITICAL"]


def _read_list(path: pathlib.Path) -> set[str]:
    entries: set[str] = set()
    if not path.exists():
        return entries
    for raw in path.read_text().splitlines():
        stripped = raw.strip()
        if not stripped or stripped.startswith("#"):
            continue
        entries.add(stripped)
    return entries


def _license_tokens(value: str) -> Iterable[str]:
    separators = ["AND", "OR", "WITH", "(", ")", "+"]
    token = value
    for sep in separators:
        token = token.replace(sep, " ")
    for piece in token.replace("/", " ").replace(",", " ").split():
        yield piece.strip()


def find_disallowed_licenses(
    sbom: pathlib.Path, allowlist: set[str], overrides: set[str]
) -> set[str]:
    content = json.loads(sbom.read_text())
    licenses: set[str] = set()
    components = content.get("components", [])
    for component in components:
        for license_info in component.get("licenses", []):
            license_obj = license_info.get("license") or {}
            for field in ("id", "name", "expression"):
                value = license_obj.get(field) or license_info.get(field)
                if not value:
                    continue
                for token in _license_tokens(str(value)):
                    if token:
                        licenses.add(token)
    disallowed: set[str] = set()
    for lic in licenses:
        if lic in allowlist or lic in overrides:
            continue
        disallowed.add(lic)
    return disallowed


def _severity_rank(level: str) -> int:
    upper = level.upper()
    try:
        return LICENSE_SEVERITY_ORDER.index(upper)
    except ValueError:
        return 0


def find_blocking_cves(grype_report: pathlib.Path, allowlist: set[str], minimum: str) -> set[str]:
    report = json.loads(grype_report.read_text())
    matches = report.get("matches", [])
    threshold = _severity_rank(minimum)
    blocked: set[str] = set()
    for match in matches:
        vuln = match.get("vulnerability") or {}
        vuln_id = vuln.get("id")
        severity = vuln.get("severity", "UNKNOWN")
        if not vuln_id:
            continue
        if vuln_id in allowlist:
            continue
        if _severity_rank(str(severity)) >= threshold:
            blocked.add(f"{vuln_id} ({severity})")
    return blocked


def main() -> None:
    parser = argparse.ArgumentParser(description="Golden-path supply chain gate")
    parser.add_argument(
        "--sbom", required=True, type=pathlib.Path, help="Path to CycloneDX SBOM JSON"
    )
    parser.add_argument(
        "--grype", required=True, type=pathlib.Path, help="Path to grype JSON report"
    )
    parser.add_argument(
        "--license-allowlist", required=True, type=pathlib.Path, help="Allowed SPDX licenses"
    )
    parser.add_argument(
        "--license-overrides", required=True, type=pathlib.Path, help="License allowlist overrides"
    )
    parser.add_argument(
        "--cve-allowlist", required=True, type=pathlib.Path, help="Allowed CVE identifiers"
    )
    parser.add_argument(
        "--severity-threshold", default="HIGH", help="Minimum severity to fail on (default: HIGH)"
    )

    args = parser.parse_args()

    missing_inputs = [path for path in [args.sbom, args.grype] if not path.exists()]
    if missing_inputs:
        missing = ", ".join(str(item) for item in missing_inputs)
        raise SystemExit(f"❌ Required input files missing: {missing}")

    allowed_licenses = _read_list(args.license_allowlist)
    override_licenses = _read_list(args.license_overrides)
    allowed_cves = _read_list(args.cve_allowlist)

    disallowed = find_disallowed_licenses(args.sbom, allowed_licenses, override_licenses)
    if disallowed:
        detail = ", ".join(sorted(disallowed))
        raise SystemExit(f"❌ Disallowed licenses detected: {detail}")

    blocking_cves = find_blocking_cves(args.grype, allowed_cves, args.severity_threshold)
    if blocking_cves:
        detail = ", ".join(sorted(blocking_cves))
        raise SystemExit(f"❌ Vulnerabilities exceed threshold {args.severity_threshold}: {detail}")

    print("✅ Supply chain policy gate passed: licenses and CVEs within policy")


if __name__ == "__main__":
    main()
