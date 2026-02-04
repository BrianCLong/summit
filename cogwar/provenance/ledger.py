from __future__ import annotations

import hashlib
from dataclasses import dataclass


@dataclass(frozen=True)
class ProvenanceRecord:
    record_id: str
    artifact_id: str
    hash_alg: str
    hash_value: str
    source: str


def hash_bytes(payload: bytes) -> str:
    digest = hashlib.sha256()
    digest.update(payload)
    return digest.hexdigest()


def build_record(record_id: str, artifact_id: str, payload: bytes, source: str) -> ProvenanceRecord:
    return ProvenanceRecord(
        record_id=record_id,
        artifact_id=artifact_id,
        hash_alg="sha256",
        hash_value=hash_bytes(payload),
        source=source,
    )


def verify_record(record: ProvenanceRecord, payload: bytes) -> bool:
    if record.hash_alg != "sha256":
        raise ValueError("Unsupported hash algorithm")
    return record.hash_value == hash_bytes(payload)
