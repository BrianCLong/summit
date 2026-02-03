"""Evidence artifact generation for deterministic intel ingestion."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from .canonical_json import canonical_dumps
from .hashing import sha256_bytes
from .source_document import SourceDocument

SCHEMA_VERSION = "0.1.0"
EVIDENCE_PREFIX = "evid.threattrace.v"


@dataclass(frozen=True)
class EvidenceResult:
    evidence_id: str
    report_path: Path
    metrics_path: Path
    stamp_path: Path


def _write_json(path: Path, payload: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(canonical_dumps(payload) + "\n", encoding="utf-8")


def _config_hash(config: dict[str, object]) -> str:
    return sha256_bytes(canonical_dumps(config).encode("utf-8"))


def _input_hash(documents: Iterable[SourceDocument]) -> tuple[str, list[str]]:
    inputs = [doc.content_sha256 for doc in documents]
    digest = sha256_bytes(canonical_dumps(inputs).encode("utf-8"))
    return digest, inputs


def _evidence_id(schema_version: str, input_sha256: str, config_sha256: str) -> str:
    return (
        f"{EVIDENCE_PREFIX}{schema_version}."
        f"{input_sha256[:12]}."
        f"{config_sha256[:12]}"
    )


def run_ingestion(
    bundle_path: Path,
    artifact_root: Path,
    *,
    source_name: str,
    provenance_uri: str,
    publisher: str = "unknown",
    provenance_confidence: str = "unknown",
    schema_version: str = SCHEMA_VERSION,
    code_version: str | None = None,
    determinism_check: bool = False,
) -> EvidenceResult:
    from .bundle_loader import load_source_documents

    documents = load_source_documents(
        bundle_path,
        source_name=source_name,
        provenance_uri=provenance_uri,
        publisher=publisher,
        provenance_confidence=provenance_confidence,
    )

    config = {
        "source_name": source_name,
        "schema_version": schema_version,
        "publisher": publisher,
        "provenance_confidence": provenance_confidence,
        "provenance_uri": provenance_uri,
    }
    config_sha256 = _config_hash(config)
    input_sha256, input_hashes = _input_hash(documents)
    evidence_id = _evidence_id(schema_version, input_sha256, config_sha256)

    report = {
        "documents": [doc.to_dict() for doc in documents],
        "evidence_id": evidence_id,
        "schema_version": schema_version,
        "source_name": source_name,
    }
    metrics = {
        "determinism_check": determinism_check,
        "doc_count": len(documents),
        "evidence_id": evidence_id,
        "schema_version": schema_version,
        "total_bytes": sum(doc.byte_size for doc in documents),
    }
    stamp = {
        "code_version": code_version or "unknown",
        "config_sha256": config_sha256,
        "determinism_check": determinism_check,
        "evidence_id": evidence_id,
        "input_sha256": input_hashes,
        "schema_version": schema_version,
    }

    evidence_dir = Path(artifact_root) / "evidence" / evidence_id
    report_path = evidence_dir / "report.json"
    metrics_path = evidence_dir / "metrics.json"
    stamp_path = evidence_dir / "stamp.json"

    _write_json(report_path, report)
    _write_json(metrics_path, metrics)
    _write_json(stamp_path, stamp)

    return EvidenceResult(
        evidence_id=evidence_id,
        report_path=report_path,
        metrics_path=metrics_path,
        stamp_path=stamp_path,
    )
