"""Core verification engine for SCPE."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Tuple

from .config import load_config, resolve_path
from .errors import ConfigError, VerificationError
from .sbom import validate_sbom
from .signatures import verify_signature
from .utils import compute_file_digest

REQUIRED_TYPES = {
    "dataset": {"dataset"},
    "python-wheel": {"python-wheel", "wheel"},
    "container-image": {"container-image", "container"},
    "training-manifest": {"training-manifest", "manifest"},
}


class Validator:
    """Validate SCPE configuration and produce verification metadata."""

    def __init__(self, config_path: Path) -> None:
        self.config_path = config_path.resolve()
        self.config = load_config(self.config_path)

    def run(self) -> Dict[str, Any]:
        artifacts, checks = self._validate_artifacts()
        sbom_result = validate_sbom(
            self.config.get("sbom", {}),
            base_path=self.config_path,
            artifacts=artifacts,
        )
        checks.append(
            {
                "name": "sbom",
                "status": "passed",
                "details": {
                    "component_count": sbom_result.get("component_count"),
                    "digest": sbom_result.get("digest"),
                },
            }
        )

        return {
            "artifacts": artifacts,
            "sbom": sbom_result,
            "checks": checks,
        }

    def _validate_artifacts(self) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        artifacts_spec = self.config.get("artifacts", [])
        if not artifacts_spec:
            raise ConfigError("Configuration must provide at least one artifact entry")

        coverage = {key: False for key in REQUIRED_TYPES}
        results: List[Dict[str, Any]] = []
        checks: List[Dict[str, Any]] = []

        for artifact in artifacts_spec:
            result, check = self._validate_single_artifact(artifact)
            results.append(result)
            checks.append(check)
            for requirement, aliases in REQUIRED_TYPES.items():
                if artifact.get("type") in aliases:
                    coverage[requirement] = True

        missing_requirements = [name for name, satisfied in coverage.items() if not satisfied]
        if missing_requirements:
            raise ConfigError(
                "Configuration missing required artifact types",
                hint=", ".join(sorted(missing_requirements)),
            )

        return results, checks

    def _validate_single_artifact(self, artifact: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        name = artifact.get("name")
        if not name:
            raise ConfigError("Each artifact must have a 'name'")

        artifact_type = artifact.get("type")
        if not artifact_type:
            raise ConfigError(f"Artifact '{name}' missing 'type'")

        path_value = artifact.get("path")
        if not path_value:
            raise ConfigError(f"Artifact '{name}' missing 'path'")
        artifact_path = resolve_path(self.config_path, path_value)
        if not artifact_path.exists():
            raise ConfigError(f"Artifact file not found: {artifact_path}")

        digest_spec = artifact.get("digest") or {}
        algorithm = digest_spec.get("algorithm", "sha256")
        expected_digest = digest_spec.get("value")
        if expected_digest is None:
            raise ConfigError(f"Artifact '{name}' missing digest value")
        actual_digest = compute_file_digest(artifact_path, algorithm)
        if actual_digest != expected_digest:
            raise VerificationError(
                f"Digest mismatch for artifact '{name}'",
                hint=f"Expected {expected_digest} but calculated {actual_digest}",
            )

        signature_spec = artifact.get("signature")
        if signature_spec is None:
            raise ConfigError(f"Artifact '{name}' missing 'signature' section")
        payload = artifact_path.read_bytes()
        verify_signature(name, signature_spec, payload, base_path=self.config_path)

        provenance = artifact.get("provenance")
        self._validate_provenance(name, provenance)

        if artifact_type in REQUIRED_TYPES["training-manifest"]:
            self._validate_training_manifest(artifact_path)

        relative_path = _relative_path(artifact_path, self.config_path.parent)

        result = {
            "name": name,
            "type": artifact_type,
            "path": relative_path,
            "digest": {"algorithm": algorithm, "value": actual_digest},
            "signature": {
                "type": signature_spec.get("type"),
                "encoding": signature_spec.get("encoding", "base64"),
                "source": signature_spec.get("path") or signature_spec.get("value"),
            },
            "provenance": provenance,
        }

        check = {
            "name": f"artifact:{name}",
            "status": "passed",
            "details": {
                "type": artifact_type,
                "digest": actual_digest,
                "signature_type": signature_spec.get("type"),
                "slsa_level": provenance.get("slsa_level") if isinstance(provenance, dict) else None,
            },
        }

        return result, check

    @staticmethod
    def _validate_provenance(name: str, provenance: Any) -> None:
        if not isinstance(provenance, dict):
            raise ConfigError(f"Artifact '{name}' must include provenance metadata")

        required_fields = ["builder_id", "source_uri", "slsa_level", "materials"]
        missing = [field for field in required_fields if field not in provenance]
        if missing:
            raise ConfigError(
                f"Artifact '{name}' provenance missing fields: {', '.join(missing)}"
            )

        slsa_level = provenance.get("slsa_level")
        if not isinstance(slsa_level, int) or slsa_level < 3:
            raise VerificationError(
                f"Artifact '{name}' does not meet minimum SLSA level",
                hint="Set 'slsa_level' to 3 or higher to satisfy the policy",
            )

        materials = provenance.get("materials")
        if not isinstance(materials, list) or not materials:
            raise ConfigError(
                f"Artifact '{name}' provenance must include at least one material entry"
            )
        for material in materials:
            if not isinstance(material, dict) or "uri" not in material or "digest" not in material:
                raise ConfigError(
                    f"Artifact '{name}' materials must define 'uri' and 'digest'"
                )

    @staticmethod
    def _validate_training_manifest(path: Path) -> None:
        document = json.loads(path.read_text(encoding="utf-8"))
        required_fields = ["model", "dataset", "hyperparameters", "build_inputs"]
        missing = [field for field in required_fields if field not in document]
        if missing:
            raise VerificationError(
                "Training manifest missing required fields",
                hint=", ".join(missing),
            )
        if not isinstance(document.get("hyperparameters"), dict):
            raise VerificationError("Training manifest hyperparameters must be a mapping")
        if not isinstance(document.get("build_inputs"), list):
            raise VerificationError("Training manifest build_inputs must be a list")


def _relative_path(path: Path, base: Path) -> str:
    try:
        return path.relative_to(base).as_posix()
    except ValueError:
        return path.as_posix()
