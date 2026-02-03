"""SourceDocument model for deterministic intel ingestion."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SourceDocument:
    source_doc_id: str
    source_name: str
    relpath: str
    provenance_uri: str
    mime_type: str
    byte_size: int
    content_sha256: str
    publisher: str
    provenance_confidence: str

    def to_dict(self) -> dict[str, object]:
        return {
            "source_doc_id": self.source_doc_id,
            "source_name": self.source_name,
            "relpath": self.relpath,
            "provenance_uri": self.provenance_uri,
            "mime_type": self.mime_type,
            "byte_size": self.byte_size,
            "content_sha256": self.content_sha256,
            "publisher": self.publisher,
            "provenance_confidence": self.provenance_confidence,
        }
