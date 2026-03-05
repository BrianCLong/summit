#!/usr/bin/env python3
"""Deterministic assurance scan for Claude-style business plugin manifests."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

HIGH_RISK_SCOPES = {
    "admin",
    "write:any",
    "workspace.admin",
    "users:write",
    "files:write",
}


def stable_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def normalize_manifest(manifest: dict[str, Any]) -> dict[str, Any]:
    normalized = {
        "plugin_id": manifest.get("plugin_id", "unknown"),
        "version": manifest.get("version", "0.0.0"),
        "capabilities": sorted(set(manifest.get("capabilities", []))),
        "oauth_scopes": sorted(set(manifest.get("oauth_scopes", []))),
        "network": {
            "enabled": bool(manifest.get("network", {}).get("enabled", False)),
            "egress_allowlist": sorted(set(manifest.get("network", {}).get("egress_allowlist", []))),
        },
        "external_write": {
            "enabled": bool(manifest.get("external_write", {}).get("enabled", False)),
            "targets_allowlist": sorted(
                set(manifest.get("external_write", {}).get("targets_allowlist", []))
            ),
        },
        "audit": {
            "log_hooks": sorted(set(manifest.get("audit", {}).get("log_hooks", []))),
        },
    }
    return normalized


def compute_findings(manifest: dict[str, Any]) -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []

    if manifest["network"]["enabled"] and not manifest["network"]["egress_allowlist"]:
        findings.append(
            {
                "id": "SUMMIT-CLAUDE-001",
                "severity": "critical",
                "message": "Unbounded network egress detected.",
            }
        )

    if manifest["external_write"]["enabled"] and not manifest["external_write"]["targets_allowlist"]:
        findings.append(
            {
                "id": "SUMMIT-CLAUDE-002",
                "severity": "high",
                "message": "External write enabled without explicit allowlist.",
            }
        )

    if not manifest["audit"]["log_hooks"]:
        findings.append(
            {
                "id": "SUMMIT-CLAUDE-003",
                "severity": "high",
                "message": "Missing audit log hooks.",
            }
        )

    high_scopes = sorted(set(manifest["oauth_scopes"]).intersection(HIGH_RISK_SCOPES))
    if high_scopes:
        findings.append(
            {
                "id": "SUMMIT-CLAUDE-004",
                "severity": "moderate",
                "message": f"High-risk OAuth scopes present: {','.join(high_scopes)}.",
            }
        )

    return findings


def compute_risk_score(findings: list[dict[str, str]]) -> int:
    weights = {"low": 1, "moderate": 3, "high": 5, "critical": 8}
    return sum(weights[finding["severity"]] for finding in findings)


def risk_level(score: int) -> str:
    if score >= 12:
        return "critical"
    if score >= 8:
        return "high"
    if score >= 4:
        return "moderate"
    return "low"


def run_scan(manifest_path: Path, output_dir: Path, threshold: int) -> int:
    manifest_raw = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest = normalize_manifest(manifest_raw)

    findings = compute_findings(manifest)
    score = compute_risk_score(findings)
    blocked = score >= threshold

    report = {
        "report_type": "claude_plugin_assurance",
        "plugin_id": manifest["plugin_id"],
        "version": manifest["version"],
        "risk_score": score,
        "risk_level": risk_level(score),
        "blocked": blocked,
        "findings": findings,
    }
    report_hash = hashlib.sha256(stable_json(report).encode("utf-8")).hexdigest()
    report["deterministic_hash"] = report_hash

    metrics = {
        "risk_score": score,
        "finding_count": len(findings),
        "blocked": 1 if blocked else 0,
    }

    stamp = {
        "scanner": "summit-claude-plugin-assurance",
        "schema_version": "1.0.0",
        "deterministic_hash": report_hash,
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "report.json").write_text(stable_json(report) + "\n", encoding="utf-8")
    (output_dir / "metrics.json").write_text(stable_json(metrics) + "\n", encoding="utf-8")
    (output_dir / "stamp.json").write_text(stable_json(stamp) + "\n", encoding="utf-8")

    return 1 if blocked else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Scan Claude plugin manifest and emit evidence artifacts.")
    parser.add_argument("manifest", type=Path, help="Path to plugin manifest JSON")
    parser.add_argument("--output-dir", type=Path, default=Path("runs/claude-plugin-scan"))
    parser.add_argument("--threshold", type=int, default=8)
    args = parser.parse_args()

    return run_scan(args.manifest, args.output_dir, args.threshold)


if __name__ == "__main__":
    raise SystemExit(main())
