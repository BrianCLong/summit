from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Literal, Optional

Platform = Literal["x", "facebook", "telegram", "other"]
NodeType = Literal["actor", "content", "url", "media", "topic"]
EdgeType = Literal["engages", "mentions", "amplifies", "co_shares", "crossposts"]


@dataclass(frozen=True)
class Node:
    id: str
    type: NodeType
    platform: Optional[Platform]
    attrs: dict[str, Any]


@dataclass(frozen=True)
class Edge:
    src: str
    dst: str
    type: EdgeType
    ts: int
    weight: float = 1.0
    attrs: Optional[dict[str, Any]] = None
