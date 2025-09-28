"""Receipt emission for deterministic runs."""

from __future__ import annotations

import dataclasses
import datetime as dt
import json
import os
import socket
import sys
from pathlib import Path
from typing import Any, Dict, Optional

from .determinism import DeterminismState, hash_training_graph, serialize_state


@dataclasses.dataclass
class DeterminismReceipt:
    """Serializable payload describing a deterministic execution."""

    created_at: str
    hostname: str
    python_version: str
    seed: Optional[int]
    graph_hash: Optional[str]
    frameworks: Dict[str, Any]
    environment: Dict[str, str]
    working_dir: str
    extra: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return dataclasses.asdict(self)

    def to_json(self, *, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent, sort_keys=True)

    def write(self, path: os.PathLike[str] | str) -> Path:
        target = Path(path)
        target.write_text(self.to_json())
        return target


class ReceiptEmitter:
    """Helper class for building determinism receipts."""

    def __init__(self, state: DeterminismState, graph: Any | None = None, extra: Optional[Dict[str, Any]] = None):
        self.state = state
        self.graph = graph
        self.extra = extra or {}

    def build(self) -> DeterminismReceipt:
        graph_hash = hash_training_graph(self.graph) if self.graph is not None else None
        state_payload = serialize_state(self.state)
        info = DeterminismReceipt(
            created_at=dt.datetime.utcnow().replace(tzinfo=dt.timezone.utc).isoformat(),
            hostname=socket.gethostname(),
            python_version=sys.version,
            seed=self.state.seed,
            graph_hash=graph_hash,
            frameworks=state_payload.get("frameworks", {}),
            environment=state_payload.get("env", {}),
            working_dir=str(Path.cwd()),
            extra=self.extra,
        )
        return info

    def write(self, path: os.PathLike[str] | str) -> Path:
        return self.build().write(path)
