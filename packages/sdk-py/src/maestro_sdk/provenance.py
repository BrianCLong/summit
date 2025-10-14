"""Helpers for constructing and verifying provenance manifests."""

from __future__ import annotations

import base64
import hashlib
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Literal, Mapping, Optional

from nacl.exceptions import BadSignatureError
from nacl.signing import SigningKey, VerifyKey

ProvenanceStepType = Literal['ingest', 'transform', 'policy-check', 'export']


def _hash_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def _canonical_json(payload: Any) -> str:
    return json.dumps(payload, sort_keys=True, separators=(',', ':'))


@dataclass
class ProvenanceStep:
    id: str
    type: ProvenanceStepType
    tool: str
    params: Dict[str, Any]
    input_hash: str
    output_hash: str
    timestamp: str = field(default_factory=_timestamp)
    note: Optional[str] = None

    @classmethod
    def from_materials(
        cls,
        *,
        id: str,
        type: ProvenanceStepType,
        tool: str,
        params: Dict[str, Any],
        input_material: bytes,
        output_material: bytes,
        note: Optional[str] = None,
    ) -> 'ProvenanceStep':
        return cls(
            id=id,
            type=type,
            tool=tool,
            params=params,
            input_hash=_hash_bytes(input_material),
            output_hash=_hash_bytes(output_material),
            note=note,
        )


@dataclass
class ProvenanceManifest:
    artifact_id: str
    steps: List[ProvenanceStep] = field(default_factory=list)

    def add_step(self, step: ProvenanceStep) -> None:
        self.steps.append(step)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'artifactId': self.artifact_id,
            'steps': [
                {
                    'id': step.id,
                    'type': step.type,
                    'tool': step.tool,
                    'params': step.params,
                    'inputHash': step.input_hash,
                    'outputHash': step.output_hash,
                    'timestamp': step.timestamp,
                    **({'note': step.note} if step.note else {}),
                }
                for step in self.steps
            ],
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)

    @classmethod
    def from_dict(cls, payload: Mapping[str, Any]) -> 'ProvenanceManifest':
        artifact_id = payload['artifactId']
        steps_payload = payload.get('steps', [])
        steps: List[ProvenanceStep] = []
        for raw in steps_payload:
            steps.append(
                ProvenanceStep(
                    id=raw['id'],
                    type=raw['type'],
                    tool=raw['tool'],
                    params=dict(raw.get('params', {})),
                    input_hash=raw['inputHash'],
                    output_hash=raw['outputHash'],
                    timestamp=raw.get('timestamp', _timestamp()),
                    note=raw.get('note'),
                )
            )
        return cls(artifact_id=artifact_id, steps=steps)

    def canonical_bytes(self) -> bytes:
        return _canonical_json(self.to_dict()).encode('utf-8')


@dataclass
class ManifestSignature:
    algorithm: str
    signature: str
    key_id: Optional[str] = None


def sign_manifest(manifest: ProvenanceManifest, signing_key: str | bytes | SigningKey, *, key_id: str | None = None) -> ManifestSignature:
    if isinstance(signing_key, SigningKey):
        key = signing_key
    else:
        key_bytes = base64.b64decode(signing_key) if isinstance(signing_key, str) else signing_key
        key = SigningKey(key_bytes)
    signature = key.sign(manifest.canonical_bytes()).signature
    return ManifestSignature(
        algorithm='ed25519',
        signature=base64.b64encode(signature).decode('ascii'),
        key_id=key_id,
    )


def verify_signature(manifest: ProvenanceManifest, signature: ManifestSignature, public_key: str | bytes | VerifyKey) -> bool:
    if signature.algorithm != 'ed25519':
        return False
    verify_key: VerifyKey
    if isinstance(public_key, VerifyKey):
        verify_key = public_key
    else:
        key_bytes = base64.b64decode(public_key) if isinstance(public_key, str) else public_key
        verify_key = VerifyKey(key_bytes)
    try:
        verify_key.verify(manifest.canonical_bytes(), base64.b64decode(signature.signature))
    except BadSignatureError:
        return False
    return True


def verify_artifacts(manifest: ProvenanceManifest, artifacts: Mapping[str, bytes]) -> bool:
    for step in manifest.steps:
        material = artifacts.get(step.id)
        if material is None:
            return False
        if _hash_bytes(material) != step.output_hash:
            return False
    return True


def write_evidence_bundle(
    manifest: ProvenanceManifest,
    directory: Path,
    *,
    signing_key: str | bytes | SigningKey | None = None,
    key_id: str | None = None,
) -> Dict[str, Path]:
    directory.mkdir(parents=True, exist_ok=True)
    manifest_path = directory / 'manifest.json'
    manifest_path.write_text(manifest.to_json())

    signature_path: Optional[Path] = None
    if signing_key is not None:
        signature = sign_manifest(manifest, signing_key, key_id=key_id)
        signature_path = directory / 'manifest.sig'
        signature_path.write_text(json.dumps(signature.__dict__, indent=2))

    hashes_path = directory / 'hashes.json'
    hashes_path.write_text(
        json.dumps(
            {
                'artifactId': manifest.artifact_id,
                'steps': {step.id: step.output_hash for step in manifest.steps},
            },
            indent=2,
        )
    )

    return {
        'manifest': manifest_path,
        'signature': signature_path or directory / 'manifest.sig',
        'hashes': hashes_path,
    }


def load_manifest(path: Path) -> ProvenanceManifest:
    return ProvenanceManifest.from_dict(json.loads(path.read_text()))


def load_signature(path: Path) -> ManifestSignature:
    payload = json.loads(path.read_text())
    return ManifestSignature(
        algorithm=payload['algorithm'],
        signature=payload['signature'],
        key_id=payload.get('keyId') or payload.get('key_id'),
    )


def verify_bundle(directory: Path, public_key_material: str | bytes | VerifyKey) -> bool:
    manifest_path = directory / 'manifest.json'
    signature_path = directory / 'manifest.sig'
    manifest = load_manifest(manifest_path)
    if not signature_path.exists():
        return False
    signature = load_signature(signature_path)
    return verify_signature(manifest, signature, public_key_material)
