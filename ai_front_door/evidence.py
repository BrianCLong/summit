from __future__ import annotations

import re
from hashlib import sha256

_EVIDENCE_PATTERN = re.compile(r'^EVID-AFD-\d{8}-\d{4}$')


class EvidenceError(ValueError):
    pass


def validate_evidence_id(evidence_id: str) -> None:
    if not _EVIDENCE_PATTERN.match(evidence_id):
        raise EvidenceError(f'Invalid evidence id format: {evidence_id}')


def canonical_request_hash(request_text: str) -> str:
    normalized = request_text.strip().lower()
    return sha256(normalized.encode('utf-8')).hexdigest()


def build_report(decision: str, evidence_id: str, request_text: str, rule_id: str) -> dict[str, str]:
    validate_evidence_id(evidence_id)
    return {
        'decision': decision,
        'evidence_id': evidence_id,
        'request_hash': canonical_request_hash(request_text),
        'rule_id': rule_id,
        'schema_version': '1.0',
    }
