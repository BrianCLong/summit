#!/usr/bin/env python3
"""Generate runbooks and remediation payloads for defined Prometheus alerts."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import yaml

ALERTS_FILE = Path("ops/observability-ci/prometheus/alerts.yml")
RUNBOOK_FILE = Path("ops/runbooks/alert-auto-runbooks.md")
ALERT_JSON_DIR = Path("ops/runbooks/generated/alerts")


@dataclass
class AlertRule:
    name: str
    summary: str
    expr: str
    severity: str

    @property
    def alert_payload(self) -> dict:
        """Return a remediation-friendly alert payload."""
        return {
            "alert_id": f"auto-{self.name.lower()}",
            "alert_name": self.name,
            "severity": self.severity,
            "service": "observability-ci",
            "tenant_id": None,
            "metrics": {"expr": self.expr},
            "timestamp": "{{ generated }}",
            "description": self.summary,
        }


def load_alerts(alerts_path: Path) -> list[AlertRule]:
    if not alerts_path.exists():
        raise SystemExit(f"Alerts file not found: {alerts_path}")

    data = yaml.safe_load(alerts_path.read_text()) or {}
    alerts: list[AlertRule] = []

    for group in data.get("groups", []):
        for rule in group.get("rules", []):
            alerts.append(
                AlertRule(
                    name=rule.get("alert", "unknown"),
                    summary=rule.get("annotations", {}).get("summary", ""),
                    expr=rule.get("expr", ""),
                    severity=rule.get("labels", {}).get("severity", "page"),
                )
            )

    return alerts


def validate_alerts(alerts: Iterable[AlertRule]) -> None:
    missing_fields: list[str] = []

    for alert in alerts:
        if not alert.name:
            missing_fields.append("alert name")
        if not alert.summary:
            missing_fields.append(f"summary missing for alert {alert.name!r}")
        if not alert.expr:
            missing_fields.append(f"expr missing for alert {alert.name!r}")

    if missing_fields:
        raise SystemExit(
            "Invalid alert definitions: " + "; ".join(sorted(set(missing_fields)))
        )


def serialize_payload(alert: AlertRule) -> str:
    return json.dumps(alert.alert_payload, indent=2, sort_keys=True) + "\n"


def write_alert_payloads(alerts: Iterable[AlertRule], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    expected_files = {f"{alert.name}.json" for alert in alerts}

    for existing in output_dir.glob("*.json"):
        if existing.name not in expected_files:
            existing.unlink()

    for alert in alerts:
        payload_path = output_dir / f"{alert.name}.json"
        payload_path.write_text(serialize_payload(alert))


def build_runbook(alerts: Iterable[AlertRule]) -> str:
    header = (
        "# Automated Alert Runbooks\n\n"
        "Generated from Prometheus alert rules with remediation and verification hooks.\n\n"
        "Each alert includes:\n"
        "- Triage summary and PromQL\n"
        "- One-click remediation via `ops/observability-ci/scripts/one-click-remediation.sh`\n"
        "- Verification hook to confirm recovery\n"
    )

    sections: list[str] = [header]

    for alert in alerts:
        sections.append(
            "\n".join(
                [
                    f"## Alert: {alert.name}",
                    f"**Severity**: `{alert.severity}`",
                    f"**Summary**: {alert.summary or 'No summary provided.'}",
                    "**PromQL**:",
                    f"```promql\n{alert.expr}\n```",
                    "**One-click remediation**:",
                    (
                        "```bash\n"
                        "./ops/observability-ci/scripts/one-click-remediation.sh \""
                        f"{alert.name}\"\n"
                        "```"
                    ),
                    "**Verification hook**:",
                    (
                        "```bash\n"
                        "make -C ops/observability-ci smoke\n"
                        "```"
                    ),
                ]
            )
        )

    return "\n\n".join(sections) + "\n"


def save_runbook(content: str, destination: Path, check_only: bool) -> None:
    if check_only:
        existing = destination.read_text() if destination.exists() else ""
        if existing != content:
            raise SystemExit(
                "Runbook content is stale. Re-run generate_alert_runbooks.py to refresh."
            )
        return

    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(content)


def ensure_payloads_current(alerts: Iterable[AlertRule], output_dir: Path) -> None:
    expected = {f"{alert.name}.json": serialize_payload(alert) for alert in alerts}

    if not output_dir.exists():
        raise SystemExit(
            f"Payload directory {output_dir} is missing. Re-run generate_alert_runbooks.py."
        )

    actual = {path.name: path.read_text() for path in output_dir.glob("*.json")}

    missing = sorted(set(expected) - set(actual))
    extra = sorted(set(actual) - set(expected))
    stale = sorted(
        name for name, content in expected.items() if actual.get(name) != content
    )

    issues: list[str] = []
    if missing:
        issues.append(f"Missing payload files: {', '.join(missing)}")
    if extra:
        issues.append(f"Unexpected payload files: {', '.join(extra)}")
    if stale:
        issues.append(f"Outdated payload files: {', '.join(stale)}")

    if issues:
        raise SystemExit("; ".join(issues))


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate alert runbooks and payloads")
    parser.add_argument(
        "--alerts-file",
        type=Path,
        default=ALERTS_FILE,
        help="Prometheus alert rules file",
    )
    parser.add_argument(
        "--runbook",
        type=Path,
        default=RUNBOOK_FILE,
        help="Output runbook markdown file",
    )
    parser.add_argument(
        "--payload-dir",
        type=Path,
        default=ALERT_JSON_DIR,
        help="Directory for generated alert payloads",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate that the runbook is up to date without writing files",
    )

    args = parser.parse_args()

    alerts = load_alerts(args.alerts_file)
    validate_alerts(alerts)
    alerts_sorted = sorted(alerts, key=lambda a: a.name)

    if not alerts_sorted:
        raise SystemExit("No alerts found; cannot generate runbooks.")

    if args.check:
        ensure_payloads_current(alerts_sorted, args.payload_dir)
    else:
        write_alert_payloads(alerts_sorted, args.payload_dir)

    content = build_runbook(alerts_sorted)
    save_runbook(content, args.runbook, args.check)


if __name__ == "__main__":
    main()
