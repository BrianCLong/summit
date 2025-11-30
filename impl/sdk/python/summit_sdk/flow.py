"""Flow decorator that compiles functions into executable graphs."""
from __future__ import annotations

import inspect
import json
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

from .telemetry import TraceEmitter


@dataclass
class FlowGraph:
    name: str
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    policy_defaults: Dict[str, Any] = field(default_factory=dict)

    def to_json(self) -> str:
        return json.dumps({
            "name": self.name,
            "nodes": self.nodes,
            "edges": self.edges,
            "policy_defaults": self.policy_defaults,
        }, indent=2)


class FlowWrapper:
    def __init__(self, fn: Callable[..., Any], emitter: TraceEmitter, policy_defaults: Optional[Dict[str, Any]] = None):
        self.fn = fn
        self.emitter = emitter
        self.policy_defaults = policy_defaults or {}
        self.__name__ = fn.__name__
        self.__doc__ = fn.__doc__

    def __call__(self, *args: Any, **kwargs: Any) -> Any:
        span = self.emitter.span("flow", {"name": self.fn.__name__})
        start = time.time()
        try:
            result = self.fn(*args, **kwargs)
            return result
        finally:
            span.finish({"duration_ms": round((time.time() - start) * 1000, 3)})

    def to_graph(self) -> FlowGraph:
        sig = inspect.signature(self.fn)
        nodes = [{
            "id": self.fn.__name__,
            "type": "python_function",
            "inputs": list(sig.parameters.keys()),
            "outputs": ["return"],
        }]
        return FlowGraph(name=self.fn.__name__, nodes=nodes, edges=[], policy_defaults=self.policy_defaults)


def flow(*, policy_defaults: Optional[Dict[str, Any]] = None, emitter: Optional[TraceEmitter] = None) -> Callable[[Callable[..., Any]], FlowWrapper]:
    """Decorator used to declare a Summit flow.

    Args:
        policy_defaults: Policy values applied when a call omits explicit context.
        emitter: Optional trace emitter to override the default.
    """

    def decorator(fn: Callable[..., Any]) -> FlowWrapper:
        wrapped_emitter = emitter or TraceEmitter()
        return FlowWrapper(fn, wrapped_emitter, policy_defaults=policy_defaults)

    return decorator

