# src/auto_scientist/schemas.py
from __future__ import annotations
from enum import Enum
from typing import Dict, List, Optional, Any
from uuid import UUID, uuid4
from datetime import datetime, timezone

from pydantic import BaseModel, Field, field_serializer, ConfigDict

def utcnow():
    return datetime.now(timezone.utc)

class NodeType(str, Enum):
    """Enumeration of the different types of nodes in the Experiment Graph."""
    HYPOTHESIS = "hypothesis"
    DATASET = "dataset"
    MODEL = "model"
    TRAIN_RUN = "train_run"
    EVAL = "eval"
    ANALYSIS = "analysis"

class EdgeType(str, Enum):
    """Enumeration of the different types of edges connecting nodes in the graph."""
    DEPENDS_ON = "depends_on"
    REFINES = "refines"
    CONTRADICTS = "contradicts"
    SUPERSEDES = "supersedes"

class Node(BaseModel):
    """Represents a single node in the Experiment Graph."""
    model_config = ConfigDict(arbitrary_types_allowed=True)

    id: UUID = Field(default_factory=uuid4)
    type: NodeType
    payload: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utcnow)
    stage: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

    @field_serializer('id')
    def serialize_id(self, id_val: UUID, _info) -> str:
        return str(id_val)

    @field_serializer('created_at')
    def serialize_dt(self, dt: datetime, _info) -> str:
        return dt.isoformat()

class Edge(BaseModel):
    """Represents a directed edge between two nodes in the Experiment Graph."""
    model_config = ConfigDict(arbitrary_types_allowed=True)

    source: UUID
    target: UUID
    type: EdgeType
    payload: Dict[str, Any] = Field(default_factory=dict)

    @field_serializer('source', 'target')
    def serialize_id(self, id_val: UUID, _info) -> str:
        return str(id_val)

class ExperimentGraphModel(BaseModel):
    """Pydantic model representing the entire state of the Experiment Graph."""
    model_config = ConfigDict(arbitrary_types_allowed=True)

    nodes: Dict[UUID, Node] = Field(default_factory=dict)
    edges: List[Edge] = Field(default_factory=list)

    @field_serializer('nodes')
    def serialize_nodes(self, nodes: Dict[UUID, Node], _info) -> Dict[str, Any]:
        return {str(k): v.model_dump(mode='json') for k, v in nodes.items()}
