from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class FilePatch:
    target_file: str
    diff: str
