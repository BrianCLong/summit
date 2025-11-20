"""Receipt generation and verification."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List

from .signing import Signature, Signer, Verifier, signature_from_dict
from .utils import canonical_json, sha256_bytes, sha256_file, write_bytes_if_changed


SCHEMA = "itrc.receipt/1"


@dataclass
class ReceiptArtifact:
    path: str
    expected_sha256: str
    actual_sha256: str

    def as_dict(self) -> Dict[str, str]:
        return {
            "path": self.path,
            "expected_sha256": self.expected_sha256,
            "actual_sha256": self.actual_sha256,
            "match": self.expected_sha256 == self.actual_sha256,
        }


@dataclass
class Receipt:
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

    def write_to(self, path: Path) -> None:
        write_bytes_if_changed(path, self.to_json().encode("utf-8"))


def build_receipt(
    *,
    capsule_digest: str,
    capsule_signature: Signature,
    artifacts: List[ReceiptArtifact],
    stdout: str,
    stderr: str,
    return_code: int,
    duration_ms: int,
    signer: Signer,
) -> Receipt:
    manifest = {
        "schema": SCHEMA,
        "capsule_digest": capsule_digest,
        "capsule_signature": capsule_signature.as_dict(),
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "artifacts": [artifact.as_dict() for artifact in artifacts],
        "return_code": return_code,
        "duration_ms": duration_ms,
        "logs": {
            "stdout": stdout,
            "stderr": stderr,
            "combined_sha256": sha256_bytes((stdout + stderr).encode("utf-8")),
        },
    }
    payload = canonical_json(manifest)
    signature = signer.sign(payload)
    return Receipt(manifest=manifest, signature=signature)


def load_receipt(path: Path, verifier: Verifier | None = None) -> Receipt:
    data = json.loads(path.read_text())
    receipt = Receipt(manifest=data["manifest"], signature=signature_from_dict(data["signature"]))
    if verifier is not None:
        verifier.verify(receipt.payload_bytes(), receipt.signature)
    return receipt


def verify_receipt_artifacts(receipt: Receipt, base_dir: Path) -> List[ReceiptArtifact]:
    verified: List[ReceiptArtifact] = []
    for artifact in receipt.manifest.get("artifacts", []):
        path = artifact["path"]
        expected = artifact["expected_sha256"]
        artifact_path = (base_dir / path).resolve()
        if not artifact_path.exists():
            actual = ""
        else:
            actual = sha256_file(artifact_path)
        verified.append(ReceiptArtifact(path=path, expected_sha256=expected, actual_sha256=actual))
    return verified
