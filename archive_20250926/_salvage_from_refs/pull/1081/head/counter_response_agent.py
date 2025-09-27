"""Light‑weight counter‑response agent for deceptive triggers."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class ActionRecord:
    """Container for a single countermeasure action."""

    timestamp: str
    agent_version: str
    target: str
    playbook: str
    confidence: float
    metadata: dict[str, str] | None = None


@dataclass
class CounterResponseAgent:
    """Simple agent that applies predefined countermeasures.

    The agent chooses from high‑level playbooks and records each action
    with a timestamp so that simulations can be replayed later. This
    version introduces a playbook registry and in-memory action history
    so that simulations can inspect previous decisions.
    """

    version: str = "0.1.0"
    playbooks: dict[str, str] = field(default_factory=dict)
    history: list[ActionRecord] = field(default_factory=list)

    def register_playbook(self, name: str, description: str) -> None:
        """Register a playbook that can later be triggered."""

        self.playbooks[name] = description

    def trigger(
        self,
        target: str,
        playbook: str,
        confidence: float = 0.0,
        metadata: dict[str, str] | None = None,
    ) -> dict[str, str]:
        """Record a countermeasure action.

        Args:
            target: Identifier of the entity being acted upon.
            playbook: Name of the playbook executed (must be registered).
            confidence: Optional confidence score from the decision model.
            metadata: Optional additional metadata about the action.

        Returns:
            Dictionary describing the applied countermeasure.
        """

        if playbook not in self.playbooks:
            raise ValueError(f"Unknown playbook: {playbook}")

        record = ActionRecord(
            timestamp=datetime.utcnow().isoformat(),
            agent_version=self.version,
            target=target,
            playbook=playbook,
            confidence=confidence,
            metadata=metadata,
        )
        self.history.append(record)
        action_dict = {
            "timestamp": record.timestamp,
            "agent_version": record.agent_version,
            "target": record.target,
            "playbook": record.playbook,
            "confidence": record.confidence,
            "metadata": record.metadata,
        }
        logging.info("Countermeasure applied", action_dict)
        return action_dict

    def get_history(self) -> list[dict[str, str]]:
        """Return the recorded action history as dictionaries."""

        return [
            {
                "timestamp": r.timestamp,
                "agent_version": r.agent_version,
                "target": r.target,
                "playbook": r.playbook,
                "confidence": r.confidence,
                "metadata": r.metadata,
            }
            for r in self.history
        ]
