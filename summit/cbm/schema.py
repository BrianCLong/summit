"""CBM data schemas and Evidence ID generation.

All artifact outputs must be deterministic:
  - No wall-clock timestamps
  - Sorted keys and lists
  - RUNHASH derived from config + input fingerprint only
  - YYYYMMDD from configured run_date, not datetime.now()

Evidence ID pattern: EVID-CBM-<YYYYMMDD>-<RUNHASH>-<SEQ>
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

# ---------------------------------------------------------------------------
# Input / ingestion types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class DocumentEvent:
    """Normalized ingest unit for CBM pipeline.

    Attributes:
        doc_id:    Stable, operator-assigned identifier (not a UUID).
        source:    Source domain or feed identifier.
        text:      Raw or pre-processed content.
        locale:    BCP-47 language tag (e.g. "en-US").
        platform:  Origin platform slug (e.g. "rss", "telegram", "export").
        ts_epoch:  Unix epoch seconds from source metadata (not ingest time).
        attrs:     Arbitrary operator-provided metadata; must not contain PII.
    """

    doc_id: str
    source: str
    text: str
    locale: str = "en"
    platform: str = "unknown"
    ts_epoch: int = 0
    attrs: dict[str, Any] = field(default_factory=dict)

    def fingerprint(self) -> str:
        """SHA-256 of stable, sorted fields (no timestamps)."""
        payload = json.dumps(
            {
                "doc_id": self.doc_id,
                "source": self.source,
                "text": self.text,
                "locale": self.locale,
                "platform": self.platform,
            },
            sort_keys=True,
        ).encode()
        return hashlib.sha256(payload).hexdigest()


# ---------------------------------------------------------------------------
# Evidence ID helpers
# ---------------------------------------------------------------------------


def make_evidence_id(run_date: str, run_hash: str, seq: int) -> str:
    """Return a deterministic Evidence ID.

    Args:
        run_date: YYYYMMDD string from CBMConfig.run_date (never wall-clock).
        run_hash: SHA-256 prefix derived from config + input fingerprints.
        seq:      Monotonic sequence number within the run.

    Returns:
        "EVID-CBM-<YYYYMMDD>-<RUNHASH8>-<SEQ04>"
    """
    return f"EVID-CBM-{run_date}-{run_hash[:8].upper()}-{seq:04d}"


def compute_run_hash(config_dict: dict[str, Any], input_fingerprints: list[str]) -> str:
    """Derive a deterministic run hash from config and sorted input fingerprints."""
    payload = json.dumps(
        {
            "config": config_dict,
            "inputs": sorted(input_fingerprints),
        },
        sort_keys=True,
    ).encode()
    return hashlib.sha256(payload).hexdigest()


# ---------------------------------------------------------------------------
# Artifact output schemas
# ---------------------------------------------------------------------------


@dataclass
class StampArtifact:
    """Deterministic run stamp — no wall-clock fields.

    Fields:
        evidence_id:  Top-level evidence ID for the run.
        run_hash:     Full SHA-256 of config + inputs.
        run_date:     YYYYMMDD from CBMConfig.run_date.
        config:       Serialized CBMConfig (flags and settings).
        input_count:  Number of DocumentEvents processed.
        status:       "ok" | "disabled" | "failed".
    """

    evidence_id: str
    run_hash: str
    run_date: str
    config: dict[str, Any]
    input_count: int
    status: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "evidence_id": self.evidence_id,
            "run_hash": self.run_hash,
            "run_date": self.run_date,
            "config": self.config,
            "input_count": self.input_count,
            "status": self.status,
        }


@dataclass
class FailureRecord:
    """Single pipeline failure entry."""

    stage: str
    error: str
    evidence_id: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        return {k: v for k, v in self.__dict__.items() if v is not None}


@dataclass
class FailuresArtifact:
    """Emitted when one or more pipeline stages fail."""

    run_hash: str
    failures: list[FailureRecord]

    def to_dict(self) -> dict[str, Any]:
        return {
            "run_hash": self.run_hash,
            "failures": sorted(
                [f.to_dict() for f in self.failures], key=lambda x: x["stage"]
            ),
        }
