from __future__ import annotations
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional, Any, Tuple

State = Dict[str, Any]
NodeFn = Callable[[State, "RunContext"], State]

@dataclass(frozen=True)
class RunContext:
    run_id: str
    flags: Dict[str, bool] = field(default_factory=dict)

@dataclass
class SummitGraph:
    nodes: Dict[str, NodeFn] = field(default_factory=dict)
    edges: Dict[str, List[str]] = field(default_factory=dict)
    entry: Optional[str] = None

    def add_node(self, name: str, fn: NodeFn) -> None:
        self.nodes[name] = fn
        self.edges.setdefault(name, [])

    def add_edge(self, src: str, dst: str) -> None:
        self.edges.setdefault(src, []).append(dst)

    def set_entry(self, name: str) -> None:
        self.entry = name

    def run(self, state: State, ctx: RunContext, *, max_steps: int = 32) -> Tuple[State, List[dict]]:
        if not ctx.flags.get("SUMMIT_AGENTKIT_ENABLED", False):
            raise RuntimeError("agentkit disabled (SUMMIT_AGENTKIT_ENABLED=0)")
        if not self.entry:
            raise ValueError("graph missing entry node")
        trace: List[dict] = []
        current = self.entry
        steps = 0
        while True:
            if steps >= max_steps:
                raise RuntimeError("max_steps exceeded")
            steps += 1
            fn = self.nodes[current]
            trace.append({"node": current, "state_keys": sorted(state.keys())})
            state = fn(state, ctx)
            nexts = self.edges.get(current, [])
            if not nexts:
                return state, trace
            # deterministic: pick first edge (routing logic comes later)
            current = nexts[0]
