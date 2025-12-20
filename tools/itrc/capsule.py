"""Capsule creation and verification utilities."""

from __future__ import annotations

import json
import time
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List

from .signing import Signature, Signer, Verifier, signature_from_dict
from .utils import Attachment, canonical_json, normalise_artifact_path, sha256_bytes, sha256_file


SCHEMA = "itrc.capsule/1"


@dataclass
class Artifact:
    path: str
    sha256: str

    def as_dict(self) -> Dict[str, str]:
        return {"path": self.path, "sha256": self.sha256}


@dataclass
class Capsule:
    manifest: Dict[str, Any]
    signature: Signature

    def to_json(self) -> str:
        return json.dumps(
            {
                "manifest": self.manifest,
                "signature": self.signature.as_dict(),
            },
            sort_keys=True,
            indent=2,
        )

    def payload_bytes(self) -> bytes:
        return canonical_json(self.manifest)


class CapsuleBuilder:
    """Constructs capsules with deterministic metadata."""

    def __init__(
        self,
        *,
        name: str,
        command: List[str],
        working_dir: Path,
        env: Dict[str, str],
        container_image_digest: str,
        env_lock_attachment: Attachment,
        dataset_lineage_ids: List[str],
        seeds: Dict[str, str],
        hardware_hints: Dict[str, str],
        policy_hashes: Dict[str, str],
        artifacts: List[Artifact],
        description: str | None = None,
    ) -> None:
        self._name = name
        self._command = command
        self._working_dir = working_dir
        self._env = env
        self._container_image_digest = container_image_digest
        self._env_lock_attachment = env_lock_attachment
        self._dataset_lineage_ids = dataset_lineage_ids
        self._seeds = seeds
        self._hardware_hints = hardware_hints
        self._policy_hashes = policy_hashes
        self._artifacts = artifacts
        self._description = description

    def build(self, signer: Signer) -> Capsule:
        manifest = {
            "schema": SCHEMA,
            "name": self._name,
            "description": self._description,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "command": self._command,
            "working_dir": str(self._working_dir),
            "environment": dict(sorted(self._env.items())),
            "lineage": {
                "container_image_digest": self._container_image_digest,
                "dataset_lineage_ids": sorted(self._dataset_lineage_ids),
                "policy_hashes": dict(sorted(self._policy_hashes.items())),
                "seeds": dict(sorted(self._seeds.items())),
                "hardware_hints": dict(sorted(self._hardware_hints.items())),
            },
            "inputs": {
                "env_lockfile": {
                    "path": self._env_lock_attachment.capsule_path,
                    "sha256": self._env_lock_attachment.sha256,
                    "source": str(self._env_lock_attachment.source_path),
                }
            },
            "artifacts": [artifact.as_dict() for artifact in self._artifacts],
        }
        payload = canonical_json(manifest)
        signature = signer.sign(payload)
        return Capsule(manifest=manifest, signature=signature)


def write_capsule(capsule: Capsule, attachments: Iterable[Attachment], destination: Path) -> None:
    """Write *capsule* to *destination* alongside its attachments."""

    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        _write_zip_entry(archive, "capsule.json", capsule.to_json().encode("utf-8"))
        for attachment in sorted(attachments, key=lambda att: att.capsule_path):
            _write_zip_entry(archive, attachment.capsule_path, attachment.source_path.read_bytes())


def load_capsule(path: Path, verifier: Verifier | None = None) -> Capsule:
    """Load a capsule from *path* and verify it if a *verifier* is provided."""

    with zipfile.ZipFile(path, "r") as archive:
        with archive.open("capsule.json") as manifest_file:
            data = json.loads(manifest_file.read().decode("utf-8"))
    capsule = Capsule(manifest=data["manifest"], signature=signature_from_dict(data["signature"]))
    if verifier is not None:
        verifier.verify(capsule.payload_bytes(), capsule.signature)
        _verify_attachments(path, capsule)
    return capsule


def _verify_attachments(path: Path, capsule: Capsule) -> None:
    with zipfile.ZipFile(path, "r") as archive:
        env_path = capsule.manifest["inputs"]["env_lockfile"]["path"]
        expected_sha = capsule.manifest["inputs"]["env_lockfile"]["sha256"]
        with archive.open(env_path) as env_file:
            actual_sha = sha256_bytes(env_file.read())
        if actual_sha != expected_sha:
            raise ValueError("Embedded env lockfile does not match manifest digest")


def _write_zip_entry(archive: zipfile.ZipFile, name: str, data: bytes) -> None:
    info = zipfile.ZipInfo(filename=name)
    info.date_time = (1980, 1, 1, 0, 0, 0)
    info.compress_type = zipfile.ZIP_DEFLATED
    archive.writestr(info, data)


def prepare_artifacts(paths: List[str], base_dir: Path) -> List[Artifact]:
    artifacts: List[Artifact] = []
    for raw_path in sorted(paths):
        normalized = normalise_artifact_path(raw_path, base_dir)
        file_path = (base_dir / raw_path).resolve()
        if not file_path.exists():
            raise FileNotFoundError(f"Artifact path {raw_path} was not found under {base_dir}")
        artifacts.append(Artifact(path=normalized, sha256=sha256_file(file_path)))
    return artifacts
