from __future__ import annotations

from dataclasses import dataclass
import os


@dataclass(frozen=True)
class FSResearcherConfig:
    enabled: bool
    max_sources: int = 5

    @classmethod
    def from_env(cls) -> "FSResearcherConfig":
        enabled = os.getenv("FS_RESEARCHER_ENABLED", "0") == "1"
        max_sources = int(os.getenv("FS_RESEARCHER_MAX_SOURCES", "5"))
        return cls(enabled=enabled, max_sources=max_sources)
