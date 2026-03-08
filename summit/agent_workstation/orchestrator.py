from __future__ import annotations

from collections.abc import Callable

AgentTask = Callable[[str], dict[str, object]]


class MultiAgentOrchestrator:
    def __init__(
        self,
        agents: dict[str, AgentTask],
        *,
        deterministic_order: bool = True,
        concurrency_limit: int = 2,
    ) -> None:
        if len(agents) < 2:
            raise ValueError("At least two agents are required")
        if concurrency_limit < 1:
            raise ValueError("concurrency_limit must be >= 1")
        self.agents = agents
        self.deterministic_order = deterministic_order
        self.concurrency_limit = concurrency_limit

    def run(self, task: str) -> list[dict[str, object]]:
        keys = list(self.agents.keys())
        if self.deterministic_order:
            keys = sorted(keys)

        results: list[dict[str, object]] = []
        for agent_name in keys[: self.concurrency_limit]:
            response = self.agents[agent_name](task)
            results.append({"agent": agent_name, "result": response})
        return results
