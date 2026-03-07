from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from typing import Iterable


@dataclass(frozen=True)
class RawFileDescriptor:
    filename: str
    size_bytes: int
    md5: str | None = None

    @property
    def evidence_ref(self) -> str:
        digest = sha256(
            f"{self.filename}:{self.size_bytes}:{self.md5 or 'nomd5'}".encode()
        ).hexdigest()
        return f"gdelt::{digest[:16]}"


def parse_index_lines(lines: Iterable[str]) -> list[RawFileDescriptor]:
    descriptors: list[RawFileDescriptor] = []
    for line in lines:
        text = line.strip()
        if not text or text.startswith("#"):
            continue
        parts = text.split(" ", 1)
        if len(parts) != 2:
            continue
        size_str, filename = parts[0].strip(), parts[1].strip()
        if not size_str.isdigit() or not filename:
            continue
        descriptors.append(RawFileDescriptor(filename=filename, size_bytes=int(size_str)))
    return descriptors


def parse_md5_lines(lines: Iterable[str]) -> dict[str, str]:
    checksums: dict[str, str] = {}
    for line in lines:
        text = line.strip()
        if not text or text.startswith("#"):
            continue
        parts = text.split(" ", 1)
        if len(parts) != 2:
            continue
        checksum, filename = parts[0].strip(), parts[1].strip()
        filename = filename.removeprefix("*")
        if len(checksum) != 32 or not filename:
            continue
        checksums[filename] = checksum
    return checksums


def merge_index_with_md5(
    index_files: list[RawFileDescriptor], checksums: dict[str, str]
) -> list[RawFileDescriptor]:
    return [
        RawFileDescriptor(
            filename=item.filename,
            size_bytes=item.size_bytes,
            md5=checksums.get(item.filename),
        )
        for item in index_files
    ]
