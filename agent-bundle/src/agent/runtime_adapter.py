from __future__ import annotations

from agent_runtime import AgentMessage, AgentSession, UnifiedAgentRuntime


def run_request(request: str, backend: str = "qwen") -> str:
    """Bridge for agent-bundle entrypoints to the unified runtime."""

    runtime = UnifiedAgentRuntime(backend_name=backend)
    runtime.start(AgentSession(session_id="bundle", backend=backend, metadata={"source": "agent-bundle"}))
    step = runtime.step(AgentMessage(content=request))
    runtime.stop()
    return step.response
