"""Light‑weight counter‑response agent for deceptive triggers."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
import json
from pathlib import Path


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
    history: list[dict[str, object]] = field(default_factory=list)
    next_id: int = 1

    def register_playbook(self, name: str, description: str) -> None:
        """Register a playbook that can be executed by the agent."""

        self.playbooks[name] = description

    def trigger(self, target: str, playbook: str, confidence: float = 0.0) -> dict[str, object]:
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
            "id": self.next_id,
            "timestamp": datetime.utcnow().isoformat(),
            "agent_version": self.version,
            "target": target,
            "playbook": playbook,
            "confidence": confidence,
        }
        self.history.append(action)
        self.next_id += 1
        logging.info("Countermeasure applied", action)
        return action

    def list_playbooks(self) -> dict[str, str]:
        """Return a copy of the registered playbooks."""

        return dict(self.playbooks)

    def deregister_playbook(self, name: str) -> bool:
        """Remove a playbook from the registry.

        Returns True if the playbook existed and was removed.
        """

        return self.playbooks.pop(name, None) is not None

    def get_history(
        self, playbook: str | None = None, target: str | None = None
    ) -> list[dict[str, object]]:
        """Return recorded actions, optionally filtered by playbook or target."""

        entries = self.history
        if playbook is not None:
            entries = [a for a in entries if a["playbook"] == playbook]
        if target is not None:
            entries = [a for a in entries if a["target"] == target]
        return list(entries)

    def export_history(self, path: str | Path) -> None:
        """Serialize the action history to a JSON file."""

        with Path(path).open("w", encoding="utf-8") as fh:
            json.dump(self.history, fh, indent=2)

    def reset(self) -> None:
        """Clear the recorded action history and reset the action counter."""

        self.history.clear()
        self.next_id = 1
