"""Unity UPM manifest adapter with deterministic Summit artifacts."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Dict

from summit.pkg.dag import build_dependency_dag
from summit.pkg.semver import validate_semver

REQUIRED_FIELDS = ("name", "version")


class UnityPackageValidationError(ValueError):
    """Raised when Unity package metadata fails validation."""


def _stable_bytes(payload: Dict[str, Any]) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _load_registry_policy(policy_path: Path) -> dict:
    if not policy_path.exists():
        raise UnityPackageValidationError(f"Registry policy missing: {policy_path}")
    text = policy_path.read_text(encoding="utf-8")

    allowed_scopes: list[str] = []
    blocked_registries: list[str] = []
    enforce_https = True

    current_key = None
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.endswith(":") and not line.startswith("-"):
            current_key = line[:-1]
            continue
        if line.startswith("-") and current_key:
            value = line[1:].strip().strip('"').strip("'")
            if current_key == "allowed_scopes":
                allowed_scopes.append(value)
            elif current_key == "blocked_registries":
                blocked_registries.append(value)
            continue
        if line.startswith("enforce_https:"):
            enforce_https = line.split(":", 1)[1].strip().lower() == "true"

    return {
        "allowed_scopes": sorted(allowed_scopes),
        "blocked_registries": sorted(blocked_registries),
        "enforce_https": enforce_https,
    }


def _scope_allowed(package_name: str, allowed_scopes: list[str]) -> bool:
    if not allowed_scopes:
        return False
    for scope in allowed_scopes:
        if scope.endswith("*"):
            if package_name.startswith(scope[:-1]):
                return True
        elif package_name == scope:
            return True
    return False


def scan_unity_package(
    manifest_path: Path,
    *,
    policy_path: Path,
) -> dict:
    manifest_payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    for field in REQUIRED_FIELDS:
        if field not in manifest_payload:
            raise UnityPackageValidationError(f"Missing required field: {field}")

    name = manifest_payload["name"]
    version = manifest_payload["version"]
    dependencies = manifest_payload.get("dependencies", {})

    if not validate_semver(version):
        raise UnityPackageValidationError(f"Invalid package version: {version}")

    invalid_dependencies = {
        dependency_name: dependency_version
        for dependency_name, dependency_version in dependencies.items()
        if not validate_semver(dependency_version)
    }
    if invalid_dependencies:
        raise UnityPackageValidationError(
            f"Invalid dependency versions: {sorted(invalid_dependencies.keys())}"
        )

    policy = _load_registry_policy(policy_path)
    if not _scope_allowed(name, policy["allowed_scopes"]):
        raise UnityPackageValidationError(f"Package scope not allowed by policy: {name}")

    scoped_registries = manifest_payload.get("scopedRegistries", [])
    registry_violations: list[str] = []
    for registry in scoped_registries:
        url = str(registry.get("url", ""))
        if policy["enforce_https"] and url.startswith("http://"):
            registry_violations.append(url)
        if any(url.startswith(prefix) for prefix in policy["blocked_registries"]):
            registry_violations.append(url)

    if registry_violations:
        raise UnityPackageValidationError(
            f"Registry policy violations detected: {sorted(set(registry_violations))}"
        )

    dag = build_dependency_dag(name, dependencies)

    package_report = {
        "evidenceId": f"EVIDENCE:UNITYPKG:{name}:{version}",
        "manifestPath": str(manifest_path),
        "package": {"name": name, "version": version},
        "dependencies": [
            {"name": dep_name, "version": dependencies[dep_name]}
            for dep_name in sorted(dependencies)
        ],
        "dependencyDag": dag,
        "policy": policy,
    }

    payload_hash = hashlib.sha256(_stable_bytes(package_report)).hexdigest()
    package_report["sha256"] = payload_hash

    metrics = {
        "dependencyCount": len(dependencies),
        "scopedRegistryCount": len(scoped_registries),
        "policyViolationCount": 0,
    }

    stamp = {
        "artifact": "package-report.json",
        "sha256": payload_hash,
        "schemaVersion": "1.0.0",
    }

    return {
        "package-report.json": package_report,
        "metrics.json": metrics,
        "stamp.json": stamp,
    }
