#!/usr/bin/env python3
"""Validate on-call rotation and PagerDuty escalation wiring in CI."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

import yaml


def load_yaml(path: Path) -> Any:
    with open(path) as handle:
        return yaml.safe_load(handle)


def validate_alertmanager_routes(config: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    data = config.get("data", {})
    notification_yaml = data.get("notification_channels.yaml") or data.get("notification_channels.yml")
    if not notification_yaml:
        return ["notification_channels.yaml missing from config map"]

    notification = yaml.safe_load(notification_yaml)
    receivers = {receiver["name"]: receiver for receiver in notification.get("receivers", [])}

    oncall = receivers.get("oncall-page")
    if not oncall:
        issues.append("oncall-page receiver is missing")
    else:
        pd_configs = oncall.get("pagerduty_configs") or []
        if not pd_configs:
            issues.append("oncall-page receiver has no pagerduty_configs")
        for entry in pd_configs:
            if "service_key" not in entry:
                issues.append("pagerduty_configs entry missing service_key")

    route = notification.get("route", {})
    if route.get("receiver") != "default":
        issues.append("root route must default to 'default' receiver")

    pagerduty_routing = [
        r
        for r in route.get("routes", [])
        if r.get("match", {}).get("severity") == "critical"
    ]
    if not pagerduty_routing:
        issues.append("no critical severity route found for on-call paging")

    return issues


def validate_pagerduty_service(definition: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    if definition.get("kind") != "PagerDutyService":
        issues.append("pagerduty-ml-service.yaml must define a PagerDutyService")

    spec = definition.get("spec", {})
    if not spec.get("escalation_policy"):
        issues.append("PagerDuty service missing escalation_policy")
    if not spec.get("oncall_rotation"):
        issues.append("PagerDuty service missing oncall_rotation entry")

    return issues


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate on-call and PagerDuty escalation settings")
    parser.add_argument(
        "--config-map",
        default="ops/slos-and-alerts.yaml",
        help="Path to alertmanager ConfigMap yaml",
    )
    parser.add_argument(
        "--pagerduty-service",
        default="ops/alerts/pagerduty-ml-service.yaml",
        help="PagerDuty service definition file",
    )
    args = parser.parse_args()

    config_map = load_yaml(Path(args.config_map))
    alert_issues = validate_alertmanager_routes(config_map)

    pagerduty = load_yaml(Path(args.pagerduty_service))
    pd_issues = validate_pagerduty_service(pagerduty)

    issues = alert_issues + pd_issues
    if issues:
        print("❌ PagerDuty/on-call validation failed:")
        for issue in issues:
            print(f" - {issue}")
        raise SystemExit(1)

    print("✅ PagerDuty/on-call validation passed")


if __name__ == "__main__":
    main()
