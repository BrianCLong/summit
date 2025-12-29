from __future__ import annotations

import abc
import dataclasses
import time
from typing import Any, Dict, List, Optional


@dataclasses.dataclass
class AgentSession:
    """Session-scoped context for a running agent."""

    session_id: str
    backend: str
    metadata: Dict[str, Any]


@dataclasses.dataclass
class AgentMessage:
    """A user message passed to the runtime loop."""

    content: str
    expected_output: Optional[str] = None
    tools: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclasses.dataclass
class ToolCall:
    name: str
    arguments: Dict[str, Any]


@dataclasses.dataclass
class ToolCallResult:
    name: str
    success: bool
    output: str
    latency_ms: float


@dataclasses.dataclass
class AgentStepResult:
    response: str
    latency_ms: float
    tool_calls: List[ToolCallResult]


class AgentRuntime(abc.ABC):
    """Standard interface shared across all agent implementations.

    Implementations must be deterministic under fixed prompts + backends to allow
    repeatable golden evaluations.
    """

    @abc.abstractmethod
    def start(self, session: AgentSession) -> None:
        ...

    @abc.abstractmethod
    def step(self, message: AgentMessage) -> AgentStepResult:
        ...

    @abc.abstractmethod
    def toolcall(self, call: ToolCall) -> ToolCallResult:
        ...

    @abc.abstractmethod
    def stop(self) -> None:
        ...


class TimingMixin:
    """Utility mixin to capture wall-clock latency."""

    def timed(self, fn, *args, **kwargs):
        start_ts = time.perf_counter()
        result = fn(*args, **kwargs)
        return result, (time.perf_counter() - start_ts) * 1000.0
