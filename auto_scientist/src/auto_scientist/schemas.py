from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Any
from uuid import uuid4
from datetime import datetime


class NodeType(str, Enum):
    HYPOTHESIS = "hypothesis"
    DATASET = "dataset"
    MODEL = "model"
    TRAIN_RUN = "train_run"
    EVAL = "eval"
    ANALYSIS = "analysis"


class EdgeType(str, Enum):
    DEPENDS_ON = "depends_on"
    REFINES = "refines"
    CONTRADICTS = "contradicts"
    SUPERSEDES = "supersedes"


@dataclass
class Node:
    id: str
    type: NodeType
    payload: Dict[str, Any]
    created_at: datetime = field(default_factory=datetime.utcnow)
    stage: Optional[str] = None  # curriculum stage label
    tags: List[str] = field(default_factory=list)

    @staticmethod
    def new(type_: NodeType, payload: Dict[str, Any], stage: Optional[str] = None,
            tags: Optional[List[str]] = None) -> "Node":
        return Node(
            id=str(uuid4()),
            type=type_,
            payload=payload,
            stage=stage,
            tags=tags or [],
        )


@dataclass
class Edge:
    source: str
    target: str
    type: EdgeType
    payload: Dict[str, Any] = field(default_factory=dict)
