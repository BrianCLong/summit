from __future__ import annotations

import hashlib
import json
from pathlib import Path

from summit.pkg.dag import build_dependency_dag, topological_order
from summit.pkg.semver import validate_semver


class UnityPackageAdapter:
    REQUIRED_FIELDS = ("name", "version")

    def __init__(self, manifest_path: str | Path):
        self.manifest_path = Path(manifest_path)

    def load_manifest(self) -> dict[str, object]:
        content = json.loads(self.manifest_path.read_text(encoding="utf-8"))
        for field in self.REQUIRED_FIELDS:
            if field not in content:
                raise ValueError(f"missing required manifest field: {field}")
        if not isinstance(content.get("dependencies", {}), dict):
            raise ValueError("manifest dependencies must be an object")
        return content

    def analyze_asmdefs(self) -> list[dict[str, object]]:
        package_root = self.manifest_path.parent
        asmdefs: list[dict[str, object]] = []
        for asmdef in sorted(package_root.rglob("*.asmdef")):
            parsed = json.loads(asmdef.read_text(encoding="utf-8"))
            asmdefs.append(
                {
                    "path": str(asmdef.relative_to(package_root)).replace("\\", "/"),
                    "name": parsed.get("name"),
                    "references": sorted(parsed.get("references", [])),
                }
            )
        return asmdefs



def _scope_allowed(scope: str, rule: str) -> bool:
    if rule.endswith(".*"):
        return scope == rule[:-2] or scope.startswith(rule[:-1])
    if rule.endswith("*"):
        return scope.startswith(rule[:-1])
    return scope == rule

def _stable_hash(path: Path) -> str:
    digest = hashlib.sha256()
    for file_path in sorted(p for p in path.rglob("*") if p.is_file()):
        digest.update(str(file_path.relative_to(path)).replace("\\", "/").encode("utf-8"))
        digest.update(file_path.read_bytes())
    return digest.hexdigest()


def build_package_report(manifest_path: str | Path, policy: dict[str, object]) -> tuple[dict[str, object], dict[str, object], dict[str, object]]:
    adapter = UnityPackageAdapter(manifest_path)
    manifest = adapter.load_manifest()

    package_name = str(manifest["name"])
    package_version = str(manifest["version"])
    validate_semver(package_version)

    dependencies = {name: version for name, version in sorted(dict(manifest.get("dependencies", {})).items())}
    for dep_version in dependencies.values():
        validate_semver(str(dep_version))

    scoped_registries = manifest.get("scopedRegistries", [])
    enforce_https = bool(policy.get("enforce_https", True))
    blocked_prefixes = list(policy.get("blocked_registries", []))
    allowed_scopes = list(policy.get("allowed_scopes", []))

    registry_violations: list[str] = []
    for entry in scoped_registries:
        url = str(entry.get("url", ""))
        if enforce_https and not url.startswith("https://"):
            registry_violations.append(f"registry must use https: {url}")
        for prefix in blocked_prefixes:
            if url.startswith(prefix):
                registry_violations.append(f"registry blocked by prefix {prefix}: {url}")
        for scope in entry.get("scopes", []):
            if allowed_scopes and not any(_scope_allowed(scope, rule) for rule in allowed_scopes):
                registry_violations.append(f"scope not allowed by policy: {scope}")

    if registry_violations:
        raise ValueError("registry policy validation failed: " + "; ".join(sorted(registry_violations)))

    dag = build_dependency_dag(package_name, dependencies)
    topo = topological_order(dag)
    asmdefs = adapter.analyze_asmdefs()
    root = adapter.manifest_path.parent

    report = {
        "evidence_id": f"EVIDENCE:UNITYPKG:{package_name}:{package_version}",
        "package": {
            "name": package_name,
            "version": package_version,
            "content_hash_sha256": _stable_hash(root),
        },
        "dependencies": dependencies,
        "dependency_dag": dag,
        "topological_order": topo,
        "assembly_boundaries": asmdefs,
        "registry_policy": {
            "allowed_scopes": allowed_scopes,
            "enforce_https": enforce_https,
            "blocked_registries": blocked_prefixes,
        },
    }
    metrics = {
        "dependency_count": len(dependencies),
        "assembly_count": len(asmdefs),
        "registry_count": len(scoped_registries),
    }
    stamp = {
        "schema": "summit.unity.package-report.v1",
        "deterministic": True,
        "artifact_keys": ["metrics", "package-report", "stamp"],
    }
    return report, metrics, stamp
