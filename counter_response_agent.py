"""Light‑weight counter‑response agent for deceptive triggers."""

from __future__ import annotations

import logging
from dataclasses import dataclass
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

    def trigger(self, target: str, playbook: str, confidence: float = 0.0) -> dict[str, str]:
        """Record a countermeasure action.

        Args:
            target: Identifier of the entity being acted upon.
            playbook: Name of the playbook executed.
            confidence: Optional confidence score from the decision model.

        Returns:
            Dictionary describing the applied countermeasure.
        """

        action = {
            "timestamp": datetime.utcnow().isoformat(),
            "agent_version": self.version,
            "target": target,
            "playbook": playbook,
            "confidence": confidence,
        }
        logging.info("Countermeasure applied", action)
        return action
