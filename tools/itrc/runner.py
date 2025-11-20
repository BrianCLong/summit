"""Capsule replay runner."""

from __future__ import annotations

import os
import subprocess
import time
from pathlib import Path
from typing import Dict, List

from .capsule import load_capsule
from .receipt import ReceiptArtifact, build_receipt
from .signing import Signer, Verifier
from .utils import parse_key_value, sha256_file


class CapsuleReplayError(RuntimeError):
    """Raised when a capsule cannot be replayed successfully."""


def run_capsule(
    capsule_path: Path,
    *,
    key: bytes,
    key_id: str | None,
    receipt_path: Path,
    artifact_base: Path | None = None,
    env_overrides: Dict[str, str] | None = None,
    workspace_override: Path | None = None,
) -> None:
    """Replay *capsule_path* and write a signed receipt to *receipt_path*."""

    verifier = Verifier(key)
    capsule = load_capsule(capsule_path, verifier)

    manifest = capsule.manifest
    working_dir = Path(workspace_override or manifest["working_dir"]).resolve()
    artifact_base = artifact_base or working_dir

    command = manifest["command"]
    if not isinstance(command, list) or not command:
        raise CapsuleReplayError("Capsule manifest command must be a non-empty list")

    environment = os.environ.copy()
    environment.update(manifest.get("environment", {}))
    if env_overrides:
        environment.update(env_overrides)
    for seed_key, seed_value in manifest.get("lineage", {}).get("seeds", {}).items():
        environment.setdefault(f"ITRC_SEED_{seed_key.upper()}", str(seed_value))
    environment.setdefault("PYTHONHASHSEED", manifest.get("lineage", {}).get("seeds", {}).get("python", "0"))

    start = time.time()
    try:
        completed = subprocess.run(
            command,
            cwd=working_dir,
            env=environment,
            check=False,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError as exc:  # pragma: no cover - environment specific
        raise CapsuleReplayError(f"Failed to execute command {command[0]}: {exc}") from exc

    duration_ms = int((time.time() - start) * 1000)

    artifacts: List[ReceiptArtifact] = []
    for artifact in manifest.get("artifacts", []):
        path = artifact["path"]
        expected = artifact["sha256"]
        artifact_path = (artifact_base / path).resolve()
        actual = sha256_file(artifact_path) if artifact_path.exists() else ""
        artifacts.append(ReceiptArtifact(path=path, expected_sha256=expected, actual_sha256=actual))

    mismatched = [artifact for artifact in artifacts if artifact.expected_sha256 != artifact.actual_sha256]
    if mismatched:
        mismatch_paths = ", ".join(artifact.path for artifact in mismatched)
        raise CapsuleReplayError(f"Replay artifacts mismatched expected digests for: {mismatch_paths}")

    signer = Signer(key, key_id or capsule.signature.key_id)
    receipt = build_receipt(
        capsule_digest=sha256_file(capsule_path),
        capsule_signature=capsule.signature,
        artifacts=artifacts,
        stdout=completed.stdout,
        stderr=completed.stderr,
        return_code=completed.returncode,
        duration_ms=duration_ms,
        signer=signer,
    )
    receipt.write_to(receipt_path)

    if completed.returncode != 0:
        raise CapsuleReplayError(
            f"Capsule command exited with {completed.returncode}. Receipt captured at {receipt_path}"
        )


def parse_env_overrides(values: List[str] | None) -> Dict[str, str]:
    if not values:
        return {}
    return parse_key_value(values)
