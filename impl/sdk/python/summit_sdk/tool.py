"""Tool decorator and runtime helper."""
from __future__ import annotations

import inspect
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Optional

from pydantic import BaseModel, ValidationError, create_model

from .telemetry import TraceEmitter


def _schema_from_signature(fn: Callable[..., Any]) -> type[BaseModel]:
    annotations = fn.__annotations__
    fields = {name: (annotation, ...) for name, annotation in annotations.items() if name != "return"}
    if not fields:
        return create_model(f"{fn.__name__.capitalize()}Input")
    return create_model(f"{fn.__name__.capitalize()}Input", **fields)


@dataclass
class ToolSpec:
    name: str
    fn: Callable[..., Any]
    schema: type[BaseModel]
    audit_tags: Dict[str, Any] = field(default_factory=dict)

    def invoke(self, payload: Dict[str, Any], emitter: TraceEmitter) -> Any:
        span = emitter.span("tool", {"tool": self.name, **self.audit_tags})
        try:
            model = self.schema(**payload)
            result = self.fn(**model.model_dump())
            span.finish({"status": "ok"})
            return result
        except ValidationError as exc:
            span.finish({"status": "validation_error", "errors": exc.errors()})
            raise
        except Exception as exc:  # pylint: disable=broad-except
            span.finish({"status": "error", "message": str(exc)})
            raise

    def __call__(self, *args: Any, **kwargs: Any) -> Any:
        """Call through to the wrapped function without validation.

        This enables ergonomic reuse of tools inside local flows while keeping
        `invoke` available for validated runtime execution.
        """

        return self.fn(*args, **kwargs)


def tool(name: Optional[str] = None, *, schema: Optional[type[BaseModel]] = None, audit_tags: Optional[Dict[str, Any]] = None) -> Callable[[Callable[..., Any]], ToolSpec]:
    """Decorator that registers a function as a Summit tool."""

    def decorator(fn: Callable[..., Any]) -> ToolSpec:
        tool_name = name or fn.__name__
        tool_schema = schema or _schema_from_signature(fn)
        return ToolSpec(name=tool_name, fn=fn, schema=tool_schema, audit_tags=audit_tags or {})

    return decorator

