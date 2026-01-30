from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Literal, Optional, Protocol

WorldPerspective = Literal["first_person", "third_person"]


@dataclass(frozen=True)
class WorldSeed:
    text_prompt: str
    image_refs: list[str]
    perspective: WorldPerspective = "first_person"


@dataclass(frozen=True)
class WorldHandle:
    provider: str
    world_id: str
    lineage: list[str]


@dataclass(frozen=True)
class StepAction:
    move: Optional[Literal["forward", "back", "left", "right"]] = None
    look_dx: float = 0.0
    look_dy: float = 0.0
    event_text: Optional[str] = None


@dataclass(frozen=True)
class StepResult:
    frame_ref: str
    state: dict[str, Any]
    latency_ms: int


class WorldSimProvider(Protocol):
    name: str

    def sketch_world(self, seed: WorldSeed, *, max_seconds: int = 60) -> WorldHandle:
        ...

    def step_world(self, handle: WorldHandle, action: StepAction) -> StepResult:
        ...

    def remix_world(self, handle: WorldHandle, *, remix_prompt: str) -> WorldHandle:
        ...

    def export_video(self, handle: WorldHandle, *, seconds: int = 10) -> str:
        ...
