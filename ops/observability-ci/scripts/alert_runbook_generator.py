#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ALERTS_FILE = REPO_ROOT / "alerts" / "slo-burn-rules.yml"
DEFAULT_OUTPUT_DIR = REPO_ROOT / "runbooks" / "generated"
DEFAULT_PAYLOAD_DIR = DEFAULT_OUTPUT_DIR / "alerts"
DEFAULT_PROPOSAL_DIR = DEFAULT_OUTPUT_DIR / "proposals"
DEFAULT_CATALOG = DEFAULT_OUTPUT_DIR / "alert-runbook-catalog.md"


@dataclass
class AlertRule:
    name: str
    severity: str
    service: str
    summary: str
    description: str
    runbook_url: str | None


def load_alerts(alert_file: Path) -> List[AlertRule]:
    data = yaml.safe_load(alert_file.read_text()) or {}
    alerts: List[AlertRule] = []

    for group in data.get("groups", []):
        for rule in group.get("rules", []):
            alerts.append(
                AlertRule(
                    name=rule.get("alert", "unknown"),
                    severity=rule.get("labels", {}).get("severity", "page"),
                    service=rule.get("labels", {}).get("service", "unknown"),
                    summary=rule.get("annotations", {}).get(
                        "summary", rule.get("alert", "unknown")
                    ),
                    description=rule.get("annotations", {}).get(
                        "description", "No description provided"
                    ),
                    runbook_url=rule.get("annotations", {}).get("runbook_url"),
                )
            )

    return alerts


def write_payload(alert: AlertRule, payload_dir: Path, timestamp: str) -> Path:
    payload_dir.mkdir(parents=True, exist_ok=True)
    payload = {
        "alert_id": alert.name,
        "alert_name": alert.summary,
        "severity": alert.severity,
        "service": alert.service,
        "tenant_id": None,
        "metrics": {},
        "timestamp": timestamp,
        "description": alert.description,
    }

    payload_path = payload_dir / f"{alert.name}.json"
    payload_path.write_text(json.dumps(payload, indent=2))
    return payload_path


def build_catalog(
    alerts: List[AlertRule],
    payload_paths: Dict[str, Path],
    proposal_dir: Path,
    catalog_path: Path,
) -> None:
    proposal_dir.mkdir(parents=True, exist_ok=True)
    lines: List[str] = [
        "# Generated Alert Runbooks",
        "",
        "This catalog is generated from `ops/alerts/slo-burn-rules.yml` and pairs each",
        "alert with a one-click remediation proposal and verification hook.",
        "",
        "Run `python ops/observability-ci/scripts/alert_runbook_generator.py` to refresh",
        "the catalog after updating alert definitions.",
        "",
    ]

    for alert in alerts:
        payload_path = payload_paths[alert.name]
        proposal_path = proposal_dir / f"{alert.name}.proposal.json"
        one_click_cmd = (
            "python ops/remediator/propose.py "
            f"--from {payload_path.relative_to(REPO_ROOT)} "
            f"--out {proposal_path.relative_to(REPO_ROOT)}"
        )
        verification_cmd = (
            "python ops/observability-ci/scripts/check_oncall_paths.py "
            f"--service {alert.service}"
        )
        lines.extend(
            [
                f"## {alert.name}",
                "",
                f"- **Service:** `{alert.service}`",
                f"- **Severity:** `{alert.severity}`",
                f"- **Summary:** {alert.summary}",
                f"- **Description:** {alert.description}",
                f"- **Runbook URL:** {alert.runbook_url or 'link pending (generated entry)'}",
                "",
                "**One-click remediation**:",
                f"```sh\n{one_click_cmd}\n```",
                "",
                "**Verification hook (CI-safe)**:",
                f"```sh\n{verification_cmd}\n```",
                "",
            ]
        )

    catalog_path.write_text("\n".join(lines))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate alert runbook catalog and payloads")
    parser.add_argument("--alerts-file", type=Path, default=DEFAULT_ALERTS_FILE)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--payload-dir", type=Path, default=DEFAULT_PAYLOAD_DIR)
    parser.add_argument("--proposal-dir", type=Path, default=DEFAULT_PROPOSAL_DIR)
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    alerts = load_alerts(args.alerts_file)
    mtime = datetime.fromtimestamp(
        int(args.alerts_file.stat().st_mtime), timezone.utc
    ).isoformat()

    payload_paths: Dict[str, Path] = {}
    for alert in alerts:
        payload_paths[alert.name] = write_payload(alert, args.payload_dir, mtime)

    build_catalog(alerts, payload_paths, args.proposal_dir, args.catalog)
    print(f"Generated {len(alerts)} alert payloads and catalog at {args.catalog}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
