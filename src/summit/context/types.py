from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, List, Protocol

ContextSegmentId = str


class Invariant(Protocol):
  id: str
  description: str

  def validate(self, payload: Any) -> bool:
    ...


@dataclass
class TrustWeight:
  value: float
  rationale: str | None = None


@dataclass
class ContextSegmentMetadata:
  id: ContextSegmentId
  source: str
  created_at: datetime
  labels: List[str] = field(default_factory=list)


@dataclass
class ContextSegment:
  metadata: ContextSegmentMetadata
  content: Any
  trust_weight: TrustWeight
  invariants: List[Invariant] = field(default_factory=list)


@dataclass
class AssembledContext:
  id: str
  segments: List[ContextSegment]
  encoded: Any


@dataclass
class ModelExecutionRequest:
  context: AssembledContext
  model_id: str
  model_input: Any


@dataclass
class ModelExecutionResponse:
  request_id: str
  model_id: str
  output: Any
  raw_trace: Any | None = None


class ModelExecutor(Protocol):
  def execute(self, request: ModelExecutionRequest) -> ModelExecutionResponse:
    ...
