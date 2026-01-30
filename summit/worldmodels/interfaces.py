from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, Optional, Protocol, Sequence, Tuple

Frame = bytes


@dataclass(frozen=True)
class Action:
    """Minimal gamepad-like action space; backends may extend via adapters."""

    dx: float = 0.0
    dy: float = 0.0
    dz: float = 0.0
    yaw: float = 0.0
    pitch: float = 0.0
    discrete: tuple[str, ...] = ()


@dataclass(frozen=True)
class CapabilityDescriptor:
    min_gpu: Optional[str] = None
    min_vram_gb: Optional[int] = None
    target_fps: Optional[int] = None
    supports_streaming: bool = False


@dataclass(frozen=True)
class StepResult:
    frames: tuple[Frame, ...]
    meta: dict[str, Any]


class WorldModelBackend(Protocol):
    name: str
    capabilities: CapabilityDescriptor

    def reset(self, initial_state: Optional[Any] = None) -> None:
        ...

    def step(self, action: Action, prompt: str = "") -> StepResult:
        ...

    def stream(
        self, actions: Iterable[Action], prompt: str = ""
    ) -> Iterable[StepResult]:
        ...


class BackendFactory(Protocol):
    def __call__(self, config: Optional[dict[str, Any]] = None) -> WorldModelBackend:
        ...


ActionBatch = Sequence[Action]
