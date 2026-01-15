from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class Node(BaseModel):
    id: str
    type: Literal["thought", "call", "observation", "correction", "system", "communication"]
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime | None = None


class Edge(BaseModel):
    source: str
    target: str
    relation: Literal["follows", "depends_on", "corrects", "contradicts", "refines"] = "follows"


class Graph(BaseModel):
    nodes: list[Node]
    edges: list[Edge]


class FeedbackItem(BaseModel):
    source: Literal["human", "model_critic"]
    score: float
    comment: str | None = None


class Episode(BaseModel):
    episode_id: str  # Kept as string to allow flexible IDs, though UUID is preferred
    task_id: str
    run_config: dict[str, Any] = Field(default_factory=dict)
    agent_id: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    graph: Graph
    outcome: Any | None = None
    scores: dict[str, float] = Field(default_factory=dict)
    feedback: list[FeedbackItem] = Field(default_factory=list)
