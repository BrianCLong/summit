#!/usr/bin/env python3
"""Generate runbooks and metadata for all configured alerts."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import yaml


ALERT_SOURCES = [
    Path("ops/alerts/slo-burn-rules.yml"),
    Path("ops/slos-and-alerts.yaml"),
]

OUTPUT_MARKDOWN = Path("ops/runbooks/generated-alert-runbooks.md")
METADATA_DIR = Path("ops/runbooks/generated/alerts")
VERIFICATION_DIR = Path("ops/runbooks/generated/verification")


def load_yaml(path: Path) -> Any:
    with open(path) as handle:
        return yaml.safe_load(handle)


def parse_prometheus_groups(groups: list[dict[str, Any]], source: Path) -> list[dict[str, Any]]:
    alerts: list[dict[str, Any]] = []
    for group in groups:
        for rule in group.get("rules", []):
            alert_name = rule.get("alert")
            if not alert_name:
                continue
            annotations = rule.get("annotations", {})
            labels = rule.get("labels", {})
            alerts.append(
                {
                    "alert": alert_name,
                    "severity": labels.get("severity", "info"),
                    "service": labels.get("service") or labels.get("component", "unknown"),
                    "summary": annotations.get("summary") or annotations.get("description", ""),
                    "description": annotations.get("description") or annotations.get("summary", ""),
                    "runbook_url": annotations.get("runbook_url"),
                    "expr": rule.get("expr", ""),
                    "source": str(source),
                }
            )
    return alerts


def parse_alert_sources() -> list[dict[str, Any]]:
    alerts: list[dict[str, Any]] = []

    slo_burn = load_yaml(ALERT_SOURCES[0])
    alerts.extend(parse_prometheus_groups(slo_burn.get("groups", []), ALERT_SOURCES[0]))

    slos_alerts = load_yaml(ALERT_SOURCES[1])
    data = slos_alerts.get("data", {})
    alert_payload = data.get("alerts.yaml") or data.get("alerts.yml")
    if alert_payload:
        inner = yaml.safe_load(alert_payload)
        alerts.extend(parse_prometheus_groups(inner.get("groups", []), ALERT_SOURCES[1]))

    return sorted(alerts, key=lambda alert: alert["alert"])


def build_markdown(alerts: list[dict[str, Any]]) -> str:
    lines: list[str] = ["# Alert Runbook Catalogue", ""]
    for alert in alerts:
        alert_name = alert["alert"]
        lines.append(f"## {alert_name}")
        lines.append("")
        lines.append(f"- Severity: `{alert['severity']}`")
        lines.append(f"- Service/Component: `{alert['service']}`")
        lines.append(f"- Source: `{alert['source']}`")
        runbook_link = alert.get("runbook_url") or "(auto-generated: see steps below)"
        lines.append(f"- Runbook URL: {runbook_link}")
        lines.append("")
        if alert.get("summary"):
            lines.append(f"**Summary**: {alert['summary']}")
            lines.append("")
        if alert.get("description"):
            lines.append(f"**Description**: {alert['description']}")
            lines.append("")

        lines.append("### One-click remediation")
        lines.append(
            f"```sh\n./ops/runbooks/one_click_remediation.sh \"{alert_name}\"\n```"
        )
        lines.append("")

        lines.append("### Verification hooks")
        lines.append(
            f"```sh\n./ops/runbooks/verify_remediation.sh \"{alert_name}\"\n```"
        )
        lines.append("")

        lines.append("### Signals to validate")
        lines.append(
            f"- PagerDuty escalation: ensure `{alert.get('severity', 'info')}` routes to on-call and resolves after remediation."
        )
        expr = alert.get("expr") or "(no expr provided)"
        lines.append(f"- PromQL check: `{expr}`")
        lines.append(
            "- Post-action SLO: verify service dashboard shows recovery before closing the incident."
        )
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def write_metadata(alerts: list[dict[str, Any]]) -> None:
    METADATA_DIR.mkdir(parents=True, exist_ok=True)
    for alert in alerts:
        alert_name = alert["alert"]
        payload = {
            "alert": alert_name,
            "severity": alert.get("severity", "info"),
            "service": alert.get("service", "unknown"),
            "summary": alert.get("summary", ""),
            "description": alert.get("description", ""),
            "runbook_url": alert.get("runbook_url"),
            "expr": alert.get("expr", ""),
            "source": alert.get("source"),
        }
        with open(METADATA_DIR / f"{alert_name}.json", "w") as handle:
            json.dump(payload, handle, indent=2, sort_keys=True)


def clean_metadata_directory(valid_alerts: list[str]) -> None:
    if not METADATA_DIR.exists():
        return
    for path in METADATA_DIR.glob("*.json"):
        if path.stem not in valid_alerts:
            path.unlink()


def generate(alerts: list[dict[str, Any]]) -> None:
    METADATA_DIR.mkdir(parents=True, exist_ok=True)
    VERIFICATION_DIR.mkdir(parents=True, exist_ok=True)
    write_metadata(alerts)
    clean_metadata_directory([alert["alert"] for alert in alerts])
    markdown = build_markdown(alerts)
    OUTPUT_MARKDOWN.write_text(markdown)


def check(alerts: list[dict[str, Any]]) -> bool:
    desired_markdown = build_markdown(alerts)
    existing_markdown = OUTPUT_MARKDOWN.read_text() if OUTPUT_MARKDOWN.exists() else ""
    if desired_markdown != existing_markdown:
        return False

    if not METADATA_DIR.exists():
        return False

    expected = {f"{alert['alert']}.json": alert for alert in alerts}
    existing_files = {path.name for path in METADATA_DIR.glob("*.json")}
    if set(expected.keys()) != existing_files:
        return False

    for filename, alert in expected.items():
        path = METADATA_DIR / filename
        with open(path) as handle:
            current = json.load(handle)
        target = {
            "alert": alert["alert"],
            "severity": alert.get("severity", "info"),
            "service": alert.get("service", "unknown"),
            "summary": alert.get("summary", ""),
            "description": alert.get("description", ""),
            "runbook_url": alert.get("runbook_url"),
            "expr": alert.get("expr", ""),
            "source": alert.get("source"),
        }
        if current != target:
            return False

    return True


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate alert runbooks with remediation hooks")
    parser.add_argument("--check", action="store_true", help="Validate generated files are up-to-date")
    args = parser.parse_args()

    alerts = parse_alert_sources()
    if args.check:
        if not check(alerts):
            raise SystemExit("Generated alert runbooks are out of date. Run without --check to refresh.")
        return

    generate(alerts)
    print(f"Generated runbook catalogue at {OUTPUT_MARKDOWN}")
    print(f"Metadata written to {METADATA_DIR}")


if __name__ == "__main__":
    main()
