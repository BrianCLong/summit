"""Deterministic intel ingestion core."""

from .bundle_loader import load_source_documents
from .evidence import EvidenceResult, run_ingestion
from .source_document import SourceDocument

__all__ = [
    "EvidenceResult",
    "SourceDocument",
    "load_source_documents",
    "run_ingestion",
]
