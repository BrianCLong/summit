"""Adapters that allow legacy `agents/` flows to call the unified runtime."""

from __future__ import annotations

from agent_runtime import AgentMessage, AgentSession, UnifiedAgentRuntime


def run_agent_task(task: str, backend: str = "qwen") -> str:
    runtime = UnifiedAgentRuntime(backend_name=backend)
    runtime.start(AgentSession(session_id="agents", backend=backend, metadata={"source": "agents"}))
    result = runtime.step(AgentMessage(content=task))
    runtime.stop()
    return result.response
