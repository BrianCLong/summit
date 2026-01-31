from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class SourceRef:
    kind: str  # repo_file|command|tool
    ref: str   # path or identifier
    sha256: str

@dataclass
class TrajectoryRef:
    path: str  # e.g., experience/packs/<id>/traj-001.json
    sha256: str

@dataclass
class RedactionManifest:
    never_log_fields: list[str] = field(default_factory=list)
    removed_patterns: list[str] = field(default_factory=list)

@dataclass
class ExperiencePack:
    id: str
    sources: list[SourceRef] = field(default_factory=list)
    trajectories: list[TrajectoryRef] = field(default_factory=list)
    redactions: Optional[RedactionManifest] = None
