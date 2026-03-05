"""Deterministic schemas and evidence id helpers for decentralized AI assurance."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Any

EVIDENCE_ID_PREFIX = "DAI"


def canonical_json_hash(payload: dict[str, Any]) -> str:
    """Compute a stable SHA-256 digest for a JSON-like payload."""
    import json

    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def evidence_id(network: str, category: str, payload: dict[str, Any]) -> str:
    """Create deterministic evidence ids in the required format."""
    digest = canonical_json_hash(payload)
    normalized_network = network.lower().replace(" ", "-")
    normalized_category = category.lower().replace(" ", "-")
    return f"{EVIDENCE_ID_PREFIX}-{normalized_network}-{normalized_category}-{digest}"


REPORT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["network", "claims", "score", "findings", "evidence_id"],
    "properties": {
        "network": {"type": "string"},
        "claims": {"type": "array", "items": {"type": "string"}},
        "score": {"type": "number"},
        "findings": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id", "title", "status"],
                "properties": {
                    "id": {"type": "string"},
                    "title": {"type": "string"},
                    "status": {"enum": ["pass", "warn", "fail"]},
                    "details": {"type": "string"},
                },
            },
        },
        "evidence_id": {"type": "string", "pattern": "^DAI-[a-z0-9-]+-[a-z0-9-]+-[a-f0-9]{64}$"},
    },
}


METRICS_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["network", "metrics", "evidence_id"],
    "properties": {
        "network": {"type": "string"},
        "metrics": {
            "type": "object",
            "required": ["validator_entropy", "token_gini", "governance_participation"],
            "properties": {
                "validator_entropy": {"type": "number"},
                "token_gini": {"type": "number"},
                "governance_participation": {"type": "number"},
            },
        },
        "evidence_id": {"type": "string", "pattern": "^DAI-[a-z0-9-]+-[a-z0-9-]+-[a-f0-9]{64}$"},
    },
}


STAMP_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["network", "deterministic", "version", "evidence_id"],
    "properties": {
        "network": {"type": "string"},
        "deterministic": {"const": True},
        "version": {"type": "string"},
        "evidence_id": {"type": "string", "pattern": "^DAI-[a-z0-9-]+-[a-z0-9-]+-[a-f0-9]{64}$"},
    },
}


@dataclass(frozen=True)
class SchemaBundle:
    """Schema bundle for report, metrics, and stamp artifacts."""

    report: dict[str, Any]
    metrics: dict[str, Any]
    stamp: dict[str, Any]


SCHEMAS = SchemaBundle(report=REPORT_SCHEMA, metrics=METRICS_SCHEMA, stamp=STAMP_SCHEMA)
