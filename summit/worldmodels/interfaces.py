from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, Optional, Protocol, Tuple

Frame = bytes


@dataclass(frozen=True)
class Action:
    """Minimal gamepad-like action space. Backends may extend via metadata."""

    dx: float = 0.0
    dy: float = 0.0
    dz: float = 0.0
    yaw: float = 0.0
    pitch: float = 0.0
    discrete: Tuple[str, ...] = ()


@dataclass(frozen=True)
class StepResult:
    frames: Tuple[Frame, ...]
    meta: Dict[str, Any]


class WorldModelBackend(Protocol):
    name: str

    def reset(self, initial_state: Optional[Any] = None) -> None: ...

    def step(self, action: Action, prompt: str = "") -> StepResult: ...

    def stream(self, actions: Iterable[Action], prompt: str = "") -> Iterable[StepResult]: ...
