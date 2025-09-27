from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Generic, TypeVar

logger = logging.getLogger(__name__)


@dataclass
class AgentConfig:
    """Configuration for constructing an agent."""

    agent_id: str
    metadata: dict[str, Any] = field(default_factory=dict)


class AgentLifecycle:
    """Mixin providing lifecycle hooks for agents."""

    def __init__(self, config: AgentConfig) -> None:
        self.config = config
        self._initialized = False
        self._last_heartbeat = 0.0

    def initialize(self) -> None:
        """Set up agent resources."""
        self._initialized = True
        self._last_heartbeat = time.time()
        logger.info("Agent %s initialized", self.config.agent_id)

    def heartbeat(self) -> None:
        """Record a liveness heartbeat."""
        self._last_heartbeat = time.time()
        logger.debug("Agent %s heartbeat at %s", self.config.agent_id, self._last_heartbeat)

    def recover(self, error: Exception) -> None:
        """Attempt basic error recovery."""
        logger.warning("Agent %s recovering from error: %s", self.config.agent_id, error)
        self.initialize()

    def shutdown(self) -> None:
        """Cleanly shutdown the agent."""
        self._initialized = False
        logger.info("Agent %s shut down", self.config.agent_id)


A = TypeVar("A", bound=AgentLifecycle)


class AgentManager(Generic[A]):
    """Simple manager for registering and monitoring agents."""

    def __init__(self) -> None:
        self.agents: dict[str, A] = {}

    def register(self, agent: A) -> None:
        self.agents[agent.config.agent_id] = agent
        if not agent._initialized:
            agent.initialize()

    def create(self, agent_cls: type[A], config: AgentConfig, *args: Any, **kwargs: Any) -> A:
        agent = agent_cls(config, *args, **kwargs)  # type: ignore[arg-type]
        self.register(agent)
        return agent

    def heartbeat(self) -> None:
        for agent in self.agents.values():
            agent.heartbeat()

    def recover(self, agent_id: str, error: Exception) -> None:
        agent = self.agents.get(agent_id)
        if agent:
            agent.recover(error)

    def remove(self, agent_id: str) -> None:
        agent = self.agents.pop(agent_id, None)
        if agent:
            agent.shutdown()
