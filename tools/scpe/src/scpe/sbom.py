"""CycloneDX SBOM validation."""

from __future__ import annotations

import json
from collections.abc import Iterable
from pathlib import Path
from typing import Any

from .errors import ConfigError, VerificationError
from .utils import compute_file_digest


class SBOMResult(dict[str, Any]):
    """Dictionary subclass representing SBOM verification metadata."""


SUPPORTED_FORMATS = {"cyclonedx-json"}


def validate_sbom(
    sbom_spec: dict[str, Any],
    *,
    base_path: Path,
    artifacts: Iterable[dict[str, Any]],
) -> SBOMResult:
    if not sbom_spec:
        raise ConfigError("Configuration requires an 'sbom' section")

    sbom_path = _resolve_file(base_path, sbom_spec.get("path"))
    format_hint = sbom_spec.get("format", "cyclonedx-json").lower()
    if format_hint not in SUPPORTED_FORMATS:
        raise ConfigError(f"Unsupported SBOM format '{format_hint}'")

    digest_spec = sbom_spec.get("digest")
    if not digest_spec:
        raise ConfigError("SBOM definition must include a digest specification")

    algorithm = digest_spec.get("algorithm", "sha256")
    expected_digest = digest_spec.get("value")
    if expected_digest is None:
        raise ConfigError("SBOM digest specification missing 'value'")

    actual_digest = compute_file_digest(sbom_path, algorithm)
    if actual_digest != expected_digest:
        raise VerificationError(
            "SBOM digest mismatch",
            hint=f"Expected {expected_digest} but calculated {actual_digest}",
        )

    document = json.loads(sbom_path.read_text(encoding="utf-8"))
    components: list[dict[str, Any]] = document.get("components", [])
    if not isinstance(components, list):
        raise VerificationError("CycloneDX SBOM must contain a list of components")

    _ensure_components_cover_artifacts(components, artifacts)

    return SBOMResult(
        {
            "path": _relative_path(sbom_path, base_path.parent),
            "format": format_hint,
            "digest": {"algorithm": algorithm, "value": actual_digest},
            "component_count": len(components),
        }
    )


def _ensure_components_cover_artifacts(
    components: list[dict[str, Any]],
    artifacts: Iterable[dict[str, Any]],
) -> None:
    component_index = {}
    for component in components:
        name = component.get("name")
        if isinstance(name, str):
            component_index[name] = component

    missing: list[str] = []
    for artifact in artifacts:
        name = artifact.get("name")
        digest = artifact.get("digest", {}).get("value")
        if not name or not digest:
            continue
        matched_component = component_index.get(name)
        if not matched_component:
            missing.append(name)
            continue
        hashes = matched_component.get("hashes", [])
        if not isinstance(hashes, list):
            raise VerificationError(f"Component '{name}' must provide a list of hashes in the SBOM")
        if not any(
            _normalize_hash(h.get("alg")) == "sha-256" and h.get("content") == digest
            for h in hashes
        ):
            raise VerificationError(
                f"SBOM entry for '{name}' does not match recorded digest",
                hint="Update the SBOM to reference the produced artifact",
            )

    if missing:
        raise VerificationError(
            "SBOM is missing components for required artifacts",
            hint=", ".join(sorted(missing)),
        )


def _resolve_file(base_path: Path, relative: Any) -> Path:
    if not isinstance(relative, str):
        raise ConfigError("SBOM 'path' must be a string")
    candidate = (base_path.parent / relative).resolve()
    if not candidate.exists():
        raise ConfigError(f"SBOM file not found: {candidate}")
    return candidate


def _normalize_hash(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    return value.lower()


def _relative_path(path: Path, base: Path) -> str:
    try:
        return path.relative_to(base).as_posix()
    except ValueError:
        return path.as_posix()
