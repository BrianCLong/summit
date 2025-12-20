"""Utility helpers for ITRC tooling."""

from __future__ import annotations

import base64
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict


def sha256_bytes(data: bytes) -> str:
    """Return the hexadecimal SHA256 digest for *data*."""
    digest = hashlib.sha256()
    digest.update(data)
    return digest.hexdigest()


def sha256_file(path: Path) -> str:
    """Return the hexadecimal SHA256 digest for the file at *path*."""
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def canonical_json(data: Any) -> bytes:
    """Return the canonical JSON representation of *data* as UTF-8 bytes."""
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def load_key(path: Path) -> bytes:
    """Load a signing or verification key from *path*.

    Blank lines and surrounding whitespace are ignored, and the contents may be
    provided either in raw binary form or as base64 encoded text.
    """

    data = path.read_bytes()
    if not data:
        raise ValueError(f"Signing key at {path} is empty")
    if any(byte > 127 for byte in data):
        return data
    stripped = data.strip().splitlines()
    if not stripped:
        raise ValueError(f"Signing key at {path} contained no usable data")
    if len(stripped) == 1:
        maybe = stripped[0].strip()
        try:
            return base64.b64decode(maybe, validate=True)
        except Exception:
            return maybe
    return b"".join(line.strip() for line in stripped)


@dataclass(frozen=True)
class Attachment:
    """Represents a file embedded inside a capsule."""

    capsule_path: str
    source_path: Path
    sha256: str

    @classmethod
    def from_source(cls, source: Path, capsule_path: str | None = None) -> "Attachment":
        source = source.resolve()
        if not source.exists():
            raise FileNotFoundError(f"Attachment source {source} not found")
        digest = sha256_file(source)
        capsule_rel = capsule_path or source.name
        return cls(capsule_path=f"attachments/{capsule_rel}", source_path=source, sha256=digest)


def ensure_directory(path: Path) -> None:
    """Create *path* and all parents if they do not exist."""

    path.mkdir(parents=True, exist_ok=True)


def write_bytes_if_changed(path: Path, data: bytes) -> None:
    """Write *data* to *path* if its current contents differ."""

    if path.exists() and path.read_bytes() == data:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def parse_key_value(items: list[str]) -> Dict[str, str]:
    """Convert KEY=VALUE strings into a dictionary."""

    result: Dict[str, str] = {}
    for item in items:
        if "=" not in item:
            raise ValueError(f"Expected KEY=VALUE formatted input, received: {item}")
        key, value = item.split("=", 1)
        key = key.strip()
        value = value.strip()
        if not key:
            raise ValueError(f"Invalid empty key in pair: {item}")
        result[key] = value
    return result


def normalise_artifact_path(path: str, base_dir: Path) -> str:
    """Return a canonical relative path for *path* from *base_dir*."""

    resolved = (base_dir / path).resolve()
    try:
        return str(resolved.relative_to(base_dir.resolve()))
    except ValueError:
        return resolved.name
