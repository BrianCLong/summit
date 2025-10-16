"""Shared dataclasses for MigrateVet."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Issue:
    file_path: Path
    line: int
    code: str
    message: str
    hint: str

    def format(self, severity: str = "WARN") -> str:
        location = f"{self.file_path}:{self.line}"
        return f"{severity}: {location}: [{self.code}] {self.message}\n    Hint: {self.hint}"


@dataclass(frozen=True)
class Statement:
    text: str
    upper: str
    start: int
    end: int


@dataclass(frozen=True)
class FileContext:
    path: Path
    source_text: str
    sanitized_text: str
    line_offsets: Sequence[int]

    def line_for_offset(self, offset: int) -> int:
        if offset < 0:
            offset = 0
        if offset >= len(self.source_text):
            return len(self.line_offsets)
        lo, hi = 0, len(self.line_offsets) - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            start = self.line_offsets[mid]
            if mid + 1 < len(self.line_offsets):
                end = self.line_offsets[mid + 1]
            else:
                end = len(self.source_text) + 1
            if start <= offset < end:
                return mid + 1
            if offset < start:
                hi = mid - 1
            else:
                lo = mid + 1
        return len(self.line_offsets)
