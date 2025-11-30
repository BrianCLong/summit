"""Model handles and transports."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from .policy import PolicyContext
from .telemetry import TraceEmitter


class ModelTransport:
    def chat(self, *, model: str, messages: List[Dict[str, str]], context: Any, tools: Any, policy: Optional[PolicyContext], params: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def complete(self, *, model: str, prompt: str, policy: Optional[PolicyContext], params: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError


class LocalTransport(ModelTransport):
    """Local echo transport used for dev/testing."""

    def __init__(self, emitter: TraceEmitter):
        self.emitter = emitter

    def chat(self, *, model: str, messages: List[Dict[str, str]], context: Any, tools: Any, policy: Optional[PolicyContext], params: Dict[str, Any]) -> Dict[str, Any]:
        span = self.emitter.span("model.chat", {"model": model, "policy": policy.to_dict() if policy else None})
        content = messages[-1]["content"] if messages else ""
        tool_names = [t.name if hasattr(t, "name") else str(t) for t in (tools or [])]
        response = {
            "text": f"[mock:{model}] {content}",
            "tool_candidates": tool_names,
            "context_used": bool(context),
        }
        span.finish({"status": "ok", "tools": tool_names})
        return response

    def complete(self, *, model: str, prompt: str, policy: Optional[PolicyContext], params: Dict[str, Any]) -> Dict[str, Any]:
        span = self.emitter.span("model.complete", {"model": model, "policy": policy.to_dict() if policy else None})
        response = {"text": f"[mock:{model}] {prompt}"}
        span.finish({"status": "ok"})
        return response


@dataclass
class ModelHandle:
    name: str
    transport: ModelTransport
    default_policy: Optional[PolicyContext]

    def chat(self, *, messages: List[Dict[str, str]], context: Any = None, tools: Any = None, policy: Optional[PolicyContext] = None, **params: Any) -> Dict[str, Any]:
        merged_policy = policy or self.default_policy
        return self.transport.chat(model=self.name, messages=messages, context=context, tools=tools, policy=merged_policy, params=params)

    def complete(self, *, prompt: str, policy: Optional[PolicyContext] = None, **params: Any) -> Dict[str, Any]:
        merged_policy = policy or self.default_policy
        return self.transport.complete(model=self.name, prompt=prompt, policy=merged_policy, params=params)

