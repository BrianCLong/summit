from __future__ import annotations
from typing import List, Dict, Optional, Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field, UUID4

class Node(BaseModel):
    id: str
    type: Literal["thought", "call", "observation", "correction", "system", "communication"]
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    timestamp: Optional[datetime] = None

class Edge(BaseModel):
    source: str
    target: str
    relation: Literal["follows", "depends_on", "corrects", "contradicts", "refines"] = "follows"

class Graph(BaseModel):
    nodes: List[Node]
    edges: List[Edge]

class FeedbackItem(BaseModel):
    source: Literal["human", "model_critic"]
    score: float
    comment: Optional[str] = None

class Episode(BaseModel):
    episode_id: str  # Kept as string to allow flexible IDs, though UUID is preferred
    task_id: str
    run_config: Dict[str, Any] = Field(default_factory=dict)
    agent_id: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    graph: Graph
    outcome: Optional[Any] = None
    scores: Dict[str, float] = Field(default_factory=dict)
    feedback: List[FeedbackItem] = Field(default_factory=list)
