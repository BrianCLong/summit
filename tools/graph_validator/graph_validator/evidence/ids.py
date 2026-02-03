from __future__ import annotations

import hashlib
from dataclasses import dataclass


@dataclass(frozen=True)
class EvidenceIdInputs:
    code_sha: str
    mapping_bytes: bytes
    seed: str
    mode: str


def _hash_hex(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def derive_evidence_id(inputs: EvidenceIdInputs) -> str:
    mapping_hash = _hash_hex(inputs.mapping_bytes)
    seed_hash = _hash_hex(inputs.seed.encode('utf-8'))
    short_code = inputs.code_sha[:12]
    short_mapping = mapping_hash[:12]
    short_seed = seed_hash[:8]
    return f'gv2/{short_code}/{short_mapping}/{short_seed}/{inputs.mode}'
