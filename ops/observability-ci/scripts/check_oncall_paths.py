"""Validate on-call coverage and PagerDuty mappings for alerting services."""

import argparse
import sys
from pathlib import Path
from typing import Dict, List, Set

import yaml


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ALERTS_FILE = REPO_ROOT / "alerts" / "slo-burn-rules.yml"
DEFAULT_ROTATIONS_FILE = REPO_ROOT / "alerts" / "oncall-rotations.yaml"
DEFAULT_PAGERDUTY_FILE = REPO_ROOT / "alerts" / "pagerduty-ml-service.yaml"
DEFAULT_PAYLOAD_DIR = REPO_ROOT / "runbooks" / "generated" / "alerts"


def _load_yaml(path: Path) -> Dict:
    if not path.exists():
        raise FileNotFoundError(f"Configuration file not found: {path}")
    return yaml.safe_load(path.read_text()) or {}


def load_alert_services(alert_file: Path) -> Set[str]:
    data = _load_yaml(alert_file)
    services: Set[str] = set()
    for group in data.get("groups", []):
        for rule in group.get("rules", []):
            service = rule.get("labels", {}).get("service")
            if service:
                services.add(service)
    return services


def load_rotations(rotations_file: Path) -> Dict[str, dict]:
    data = _load_yaml(rotations_file)
    rotations: Dict[str, dict] = {}
    for rotation in data.get("spec", {}).get("rotations", []):
        service = rotation.get("service")
        if service:
            rotations[service] = rotation
    return rotations


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate on-call rotation and PagerDuty escalation coverage in CI"
    )
    parser.add_argument("--alerts-file", type=Path, default=DEFAULT_ALERTS_FILE)
    parser.add_argument("--rotations-file", type=Path, default=DEFAULT_ROTATIONS_FILE)
    parser.add_argument("--pagerduty-file", type=Path, default=DEFAULT_PAGERDUTY_FILE)
    parser.add_argument("--payload-dir", type=Path, default=DEFAULT_PAYLOAD_DIR)
    parser.add_argument(
        "--service",
        help="Validate a single service instead of all alerting services",
    )
    return parser.parse_args()


def validate_pagerduty_bridge(
    rotations_blob: Dict, pagerduty_blob: Dict
) -> List[str]:
    errors: List[str] = []

    expected_service = rotations_blob.get("spec", {}).get("pagerduty_service")
    pd_service = pagerduty_blob.get("metadata", {}).get("name")
    if expected_service and pd_service != expected_service:
        errors.append(
            "PagerDuty service mismatch: rotations expect "
            f"{expected_service}, pagerduty config defines {pd_service}"
        )

    expected_policy = rotations_blob.get("spec", {}).get("escalation_policy")
    pd_policy = pagerduty_blob.get("spec", {}).get("escalation_policy")
    if expected_policy and pd_policy != expected_policy:
        errors.append(
            "Escalation policy mismatch: rotations expect "
            f"{expected_policy}, pagerduty config defines {pd_policy}"
        )

    return errors


def validate_rotations(
    services: Set[str],
    rotations: Dict[str, dict],
    payload_dir: Path,
    pagerduty_blob: Dict,
) -> List[str]:
    errors: List[str] = []
    if not payload_dir.exists():
        errors.append(f"Payload directory {payload_dir} is missing; run the generator first")

    configured_policy = pagerduty_blob.get("spec", {}).get("escalation_policy")

    for service in sorted(services):
        rotation = rotations.get(service)
        if rotation is None:
            errors.append(f"Missing on-call rotation for service: {service}")
            continue
        hooks = rotation.get("verification_hooks", [])
        if not hooks:
            errors.append(f"Service {service} has no verification hooks configured")
        for hook in hooks:
            if not hook.get("type"):
                errors.append(f"Service {service} has a verification hook without a type")

        escalation = rotation.get("pagerduty_escalation_policy")
        if escalation and escalation != configured_policy:
            errors.append(
                f"Service {service} escalation policy {escalation} does not match "
                f"PagerDuty config {configured_policy}"
            )

    return errors


def main() -> int:
    args = parse_args()

    try:
        services = load_alert_services(args.alerts_file)
        rotations = load_rotations(args.rotations_file)
        pagerduty_blob = _load_yaml(args.pagerduty_file)
    except FileNotFoundError as error:
        print(f"::error::{error}", file=sys.stderr)
        return 1

    if args.service:
        services = {args.service}

    errors = validate_pagerduty_bridge(rotations, pagerduty_blob)
    errors.extend(validate_rotations(services, rotations, args.payload_dir, pagerduty_blob))

    if errors:
        for error in errors:
            print(f"::error::{error}", file=sys.stderr)
        return 1

    print(
        "✅ On-call rotation and PagerDuty escalation paths validated for services: "
        + ", ".join(sorted(services))
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
