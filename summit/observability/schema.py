from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class ObservabilityEvent:
    """Base class for all observability events."""
    event_type: str
    timestamp: float = field(default_factory=time.time)
    metadata: dict[str, Any] = field(default_factory=dict)

@dataclass
class AgentSpan(ObservabilityEvent):
    """Represents a span of agent execution (e.g., LLM call, tool use)."""
    span_id: str = ""
    parent_id: Optional[str] = None
    agent_id: str = "unknown"
    name: str = "agent_span"
    start_time: float = field(default_factory=time.time)
    end_time: Optional[float] = None
    inputs: dict[str, Any] = field(default_factory=dict)
    outputs: Optional[dict[str, Any]] = None
    status: str = "running"  # running, success, error

    def __post_init__(self):
        self.event_type = "agent_span"

@dataclass
class DecisionEvent(ObservabilityEvent):
    """Represents a final decision made by an agent."""
    decision_id: str = ""
    agent_id: str = "unknown"
    decision: dict[str, Any] = field(default_factory=dict)
    confidence: float = 0.0
    reasoning: str = ""

    def __post_init__(self):
        self.event_type = "decision_made"
