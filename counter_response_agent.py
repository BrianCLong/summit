"""Light‑weight counter‑response agent for deceptive triggers."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class CounterResponseAgent:
    """Simple agent that applies predefined countermeasures.

    The agent chooses from high‑level playbooks and records each action
    with a timestamp so that simulations can be replayed later. This is a
    minimal implementation intended to be expanded with real
    orchestration logic.
    """

    version: str = "0.1.0"
    playbooks: dict[str, str] = field(default_factory=dict)
    history: list[dict[str, str]] = field(default_factory=list)

    def register_playbook(self, name: str, description: str) -> None:
        """Register a playbook that can be executed by the agent."""

        self.playbooks[name] = description

    def trigger(self, target: str, playbook: str, confidence: float = 0.0) -> dict[str, str]:
        """Record a countermeasure action.

        Args:
            target: Identifier of the entity being acted upon.
            playbook: Name of the playbook executed. Must be registered.
            confidence: Optional confidence score from the decision model.

        Returns:
            Dictionary describing the applied countermeasure.

        Raises:
            ValueError: If the playbook has not been registered.
        """

        if playbook not in self.playbooks:
            raise ValueError(f"Unknown playbook: {playbook}")

        action = {
            "timestamp": datetime.utcnow().isoformat(),
            "agent_version": self.version,
            "target": target,
            "playbook": playbook,
            "confidence": confidence,
        }
        self.history.append(action)
        logging.info("Countermeasure applied", action)
        return action

    def get_history(self) -> list[dict[str, str]]:
        """Return a copy of recorded countermeasure actions."""

        return list(self.history)

    def reset(self) -> None:
        """Clear the recorded action history."""

        self.history.clear()
