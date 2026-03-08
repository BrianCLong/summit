"""Adapter that ingests Unity UPM-style package manifests."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from summit.pkg.dag import build_manifest_graph, topological_sort
from summit.pkg.semver import SemVerError, validate_semver

REQUIRED_FIELDS = ("name", "version")


class UnityManifestError(ValueError):
    """Raised when a Unity package manifest fails validation."""


def _load_json(path: Path) -> dict[str, Any]:
    try:
        raw = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise UnityManifestError(f"Failed to read manifest at {path}") from exc

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise UnityManifestError(f"Manifest is not valid JSON: {path}") from exc

    if not isinstance(payload, dict):
        raise UnityManifestError("Manifest root must be a JSON object")
    return payload


def _stable_json(data: dict[str, Any]) -> str:
    return json.dumps(data, sort_keys=True, separators=(",", ":"))


def _assembly_definitions(package_root: Path) -> list[str]:
    asmdefs: list[str] = []
    for asmdef in sorted(package_root.rglob("*.asmdef")):
        asmdefs.append(str(asmdef.relative_to(package_root)).replace("\\", "/"))
    return asmdefs


def parse_unity_package(manifest_path: str | Path) -> dict[str, Any]:
    """Parse and validate a Unity package manifest into a deterministic report."""

    manifest = Path(manifest_path)
    package_root = manifest.parent
    payload = _load_json(manifest)

    for field in REQUIRED_FIELDS:
        if field not in payload or not payload[field]:
            raise UnityManifestError(f"Manifest missing required field: {field}")

    package_name = str(payload["name"])
    try:
        version = validate_semver(str(payload["version"]))
    except SemVerError as exc:
        raise UnityManifestError(str(exc)) from exc

    dependencies_raw = payload.get("dependencies", {})
    if not isinstance(dependencies_raw, dict):
        raise UnityManifestError("dependencies must be an object")

    dependencies: dict[str, str] = {}
    for dep_name, dep_version in sorted(dependencies_raw.items()):
        dependencies[str(dep_name)] = validate_semver(str(dep_version), production_mode=False)

    graph = build_manifest_graph(package_name, dependencies)
    topo_order = topological_sort(graph)

    manifest_digest = hashlib.sha256(_stable_json(payload).encode("utf-8")).hexdigest()
    evidence_id = f"EVIDENCE:UNITYPKG:{package_name}:{version}"

    report = {
        "schema_version": "1.0.0",
        "evidence_id": evidence_id,
        "package": {
            "name": package_name,
            "version": version,
            "manifest_sha256": manifest_digest,
            "dependencies": dependencies,
            "assembly_definitions": _assembly_definitions(package_root),
        },
        "dependency_dag": {
            "nodes": sorted(graph),
            "edges": [
                {"from": node, "to": dep}
                for node in sorted(graph)
                for dep in sorted(graph[node])
            ],
            "topological_order": topo_order,
        },
    }
    return report


def write_artifacts(report: dict[str, Any], output_dir: str | Path) -> None:
    """Write deterministic package report artifacts to disk."""

    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    metrics = {
        "dependency_count": len(report["package"]["dependencies"]),
        "asmdef_count": len(report["package"]["assembly_definitions"]),
    }
    stamp = {
        "evidence_id": report["evidence_id"],
        "report_sha256": hashlib.sha256(_stable_json(report).encode("utf-8")).hexdigest(),
    }

    for filename, data in (
        ("package-report.json", report),
        ("dependency-dag.json", report["dependency_dag"]),
        ("metrics.json", metrics),
        ("stamp.json", stamp),
    ):
        (out_dir / filename).write_text(f"{_stable_json(data)}\n", encoding="utf-8")
