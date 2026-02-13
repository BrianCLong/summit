"""Bundle loader for deterministic SourceDocument manifests."""

from __future__ import annotations

import mimetypes
import os
from pathlib import Path
from typing import Iterable, List

from .hashing import sha256_file
from .source_document import SourceDocument


def _iter_bundle_files(bundle_path: Path) -> Iterable[Path]:
    if bundle_path.is_file():
        yield bundle_path
        return

    for root, dirnames, filenames in os.walk(bundle_path):
        dirnames.sort()
        for filename in sorted(filenames):
            yield Path(root) / filename


def _guess_mime(path: Path) -> str:
    mime_type, _ = mimetypes.guess_type(path.as_posix())
    return mime_type or "application/octet-stream"


def load_source_documents(
    bundle_path: Path,
    *,
    source_name: str,
    provenance_uri: str,
    publisher: str = "unknown",
    provenance_confidence: str = "unknown",
) -> list[SourceDocument]:
    bundle_path = Path(bundle_path)
    documents: list[SourceDocument] = []

    if not bundle_path.exists():
        raise FileNotFoundError(f"Bundle path not found: {bundle_path}")

    for file_path in _iter_bundle_files(bundle_path):
        relpath = (
            file_path.name
            if bundle_path.is_file()
            else file_path.relative_to(bundle_path).as_posix()
        )
        content_hash = sha256_file(file_path)
        byte_size = file_path.stat().st_size
        source_doc_id = f"{source_name}:{content_hash}"
        documents.append(
            SourceDocument(
                source_doc_id=source_doc_id,
                source_name=source_name,
                relpath=relpath,
                provenance_uri=provenance_uri,
                mime_type=_guess_mime(file_path),
                byte_size=byte_size,
                content_sha256=content_hash,
                publisher=publisher,
                provenance_confidence=provenance_confidence,
            )
        )

    return sorted(documents, key=lambda doc: doc.relpath)
