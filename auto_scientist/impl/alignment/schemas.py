import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class Candidate(BaseModel):
    text: str
    tool_traces: list[dict[str, Any]] | None = None
    graph_ops: list[dict[str, Any]] | None = None
    logprobs: dict[str, float] | None = None


class Preference(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    prompt: str
    candidates: list[Candidate]
    chosen_idx: int
    rejected_idx: int
    rationale: str | None = None
    safety_tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AlignmentConfig(BaseModel):
    model_name: str
    learning_rate: float = 1e-6
    batch_size: int = 4
    beta: float = 0.1
    max_steps: int = 1000
    output_dir: str = "./output"
