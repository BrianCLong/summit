#!/usr/bin/env python3
"""Validate on-call rotation metadata and PagerDuty escalation wiring for CI."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

ROTATION_FILE = Path("ops/alerts/oncall-rotation.yaml")
PAGERDUTY_SERVICE_FILE = Path("ops/alerts/pagerduty-ml-service.yaml")
ALERT_CONFIG_FILE = Path("ops/slos-and-alerts.yaml")


def load_yaml(path: Path) -> Any:
    if not path.exists():
        raise SystemExit(f"Configuration file not found: {path}")

    return yaml.safe_load(path.read_text())


def validate_rotation(rotation: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    required_roles = ["primary", "secondary"]
    for role in required_roles:
        details = rotation.get(role)
        if not details:
            errors.append(f"missing rotation block for {role}")
            continue

        for key in ("schedule", "escalation_policy", "paging_channel", "shift_length"):
            if not details.get(key):
                errors.append(f"rotation.{role}.{key} is required")

    return errors


def validate_pagerduty_service(
    service: dict[str, Any], expected_policy: str | None, expected_service: str | None
) -> list[str]:
    errors: list[str] = []
    metadata = service.get("metadata", {})
    spec = service.get("spec", {})

    service_name = metadata.get("name")
    if expected_service and service_name != expected_service:
        errors.append(
            "pagerduty service name does not align with rotation.pagerduty.service"
        )

    if expected_policy and spec.get("escalation_policy") != expected_policy:
        errors.append(
            "pagerduty escalation_policy does not match rotation contract"
        )

    if not spec.get("incident_urgency_rules"):
        errors.append("pagerduty incident_urgency_rules must be defined")

    integrations = spec.get("integrations", [])
    if not integrations:
        errors.append("pagerduty integrations must be declared")
    else:
        for integration in integrations:
            if not integration.get("routing_key_secret"):
                errors.append("pagerduty integration missing routing_key_secret")

    return errors


def validate_notification_routes(alert_config: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    notification_blob = alert_config.get("data", {}).get("notification_channels.yaml")
    if not notification_blob:
        return ["notification_channels.yaml missing from alert ConfigMap"]

    notification = yaml.safe_load(notification_blob)
    if not isinstance(notification, dict):
        return ["notification_channels.yaml must be a YAML mapping"]
    receivers = {item.get("name"): item for item in notification.get("receivers", [])}

    oncall_receiver = receivers.get("oncall-page")
    if not oncall_receiver:
        errors.append("oncall-page receiver missing from notification_channels.yaml")
    else:
        pagerduty_configs = oncall_receiver.get("pagerduty_configs")
        if not pagerduty_configs:
            errors.append("oncall-page receiver must define pagerduty_configs")
        else:
            for config in pagerduty_configs:
                if not config.get("service_key"):
                    errors.append(
                        "pagerduty_configs entries must include service_key for oncall-page"
                    )

    routes = notification.get("route", {}).get("routes", [])
    critical_routes = [r for r in routes if r.get("match", {}).get("severity") == "critical"]
    if not critical_routes:
        errors.append("critical routes are not mapped to oncall receiver")

    return errors


def main() -> None:
    rotation_config = load_yaml(ROTATION_FILE)
    pd_service = load_yaml(PAGERDUTY_SERVICE_FILE)
    alert_config = load_yaml(ALERT_CONFIG_FILE)

    errors: list[str] = []
    rotation_section = rotation_config.get("rotation", {})
    errors.extend(validate_rotation(rotation_section))
    pagerduty_section = rotation_config.get("pagerduty", {})
    errors.extend(
        validate_pagerduty_service(
            pd_service,
            pagerduty_section.get("escalation_policy"),
            pagerduty_section.get("service"),
        )
    )
    errors.extend(validate_notification_routes(alert_config))

    if errors:
        for err in errors:
            print(f"❌ {err}")
        raise SystemExit(1)

    print("✅ On-call rotation and PagerDuty escalation paths validated")


if __name__ == "__main__":
    main()
