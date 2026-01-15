from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any
from uuid import uuid4


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
    payload: dict[str, Any]
    created_at: datetime = field(default_factory=datetime.utcnow)
    stage: str | None = None  # curriculum stage label
    tags: list[str] = field(default_factory=list)

    @staticmethod
    def new(
        type_: NodeType,
        payload: dict[str, Any],
        stage: str | None = None,
        tags: list[str] | None = None,
    ) -> Node:
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
    payload: dict[str, Any] = field(default_factory=dict)
