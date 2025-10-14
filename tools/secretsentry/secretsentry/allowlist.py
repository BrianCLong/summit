"""Allowlist parsing for SecretSentry."""

from __future__ import annotations

from dataclasses import dataclass
from fnmatch import fnmatch
from pathlib import Path
from typing import Iterable


@dataclass
class Allowlist:
    patterns: tuple[str, ...]

    @classmethod
    def from_file(cls, path: Path | None) -> "Allowlist":
        if path is None or not path.exists() or path.is_dir():
            return cls(patterns=())
        lines = []
        for raw in path.read_text(encoding="utf-8").splitlines():
            stripped = raw.strip()
            if not stripped or stripped.startswith("#"):
                continue
            lines.append(stripped)
        return cls(patterns=tuple(lines))

    def is_ignored(self, relative_path: str) -> bool:
        for pattern in self.patterns:
            if fnmatch(relative_path, pattern):
                return True
        return False

    def extend(self, extra: Iterable[str]) -> "Allowlist":
        merged: list[str] = list(self.patterns)
        for pattern in extra:
            if pattern not in merged:
                merged.append(pattern)
        return Allowlist(patterns=tuple(merged))
