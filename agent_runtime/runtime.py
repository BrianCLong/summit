from __future__ import annotations

import json
from typing import Dict, List

from .backends import GoldenOverrideStore, backend_for
from .interface import AgentMessage, AgentRuntime, AgentSession, AgentStepResult, ToolCall, ToolCallResult
from .prompts import PromptLoader


class UnifiedAgentRuntime(AgentRuntime):
    """Reference runtime used by both `agents/` and `agent-bundle/` flows."""

    def __init__(self, *, backend_name: str, golden_records: List[Dict] | None = None) -> None:
        self.prompt_loader = PromptLoader()
        self.session: AgentSession | None = None
        overrides = GoldenOverrideStore.from_records(golden_records or [])
        self.backend = backend_for(backend_name, overrides.as_dict())
        self.tool_latency_budget_ms = 150.0

    def start(self, session: AgentSession) -> None:
        self.session = session

    def step(self, message: AgentMessage) -> AgentStepResult:
        if not self.session:
            raise RuntimeError("Runtime not started. Call start() first.")
        rendered_prompt = self.prompt_loader.render(
            "runtime",
            variables={
                "user_input": message.content,
                "backend": self.session.backend,
                "context": json.dumps(self.session.metadata, sort_keys=True),
            },
        )
        response, latency_ms = self.backend.timed(self.backend.generate, rendered_prompt, message)
        tool_calls: List[ToolCallResult] = []
        # Simple tool pattern: echo out requested tools as successful JSON payloads.
        for tool_name in message.tools or []:
            tool_result = self.toolcall(
                ToolCall(name=tool_name, arguments={"input": message.content, "backend": self.session.backend})
            )
            tool_calls.append(tool_result)
        return AgentStepResult(response=response, latency_ms=latency_ms, tool_calls=tool_calls)

    def toolcall(self, call: ToolCall) -> ToolCallResult:
        payload = {"tool": call.name, "args": call.arguments}
        output = json.dumps(payload, sort_keys=True)
        return ToolCallResult(name=call.name, success=True, output=output, latency_ms=self.tool_latency_budget_ms)

    def stop(self) -> None:
        self.session = None
