"""Light-weight counter-response agent for deceptive triggers.

This module models a pragmatic orchestration helper that allows scenario
simulations to register rich playbooks, enforce preconditions, and
collect auditable telemetry.  It intentionally remains dependency light
so that it can be embedded inside notebooks or larger services without
pulling extra frameworks.
"""

from __future__ import annotations

import json
import logging
from copy import deepcopy
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Iterable, Mapping


@dataclass(frozen=True)
class PlaybookDefinition:
    """Structured metadata describing a counter-response playbook."""

    description: str
    severity: str = "informational"
    channels: tuple[str, ...] = ()
    prerequisites: tuple[str, ...] = ()
    cooldown_seconds: int = 0
    tags: tuple[str, ...] = ()
    metadata: Mapping[str, object] | None = None

    def to_record(self) -> dict[str, object]:
        """Return a JSON-serialisable representation of the playbook."""

        record: dict[str, object] = {
            "description": self.description,
            "severity": self.severity,
            "channels": list(self.channels),
            "prerequisites": list(self.prerequisites),
            "cooldown_seconds": self.cooldown_seconds,
            "tags": list(self.tags),
        }
        if self.metadata:
            record["metadata"] = dict(self.metadata)
        return record

    @staticmethod
    def from_record(record: Mapping[str, object]) -> "PlaybookDefinition":
        """Hydrate a :class:`PlaybookDefinition` from a mapping."""

        metadata = record.get("metadata")
        return PlaybookDefinition(
            description=str(record["description"]),
            severity=str(record.get("severity", "informational")),
            channels=tuple(record.get("channels", ()) or ()),
            prerequisites=tuple(record.get("prerequisites", ()) or ()),
            cooldown_seconds=int(record.get("cooldown_seconds", 0)),
            tags=tuple(record.get("tags", ()) or ()),
            metadata=dict(metadata) if isinstance(metadata, Mapping) else None,
        )


@dataclass
class CounterResponseAgent:
    """Simple agent that applies predefined countermeasures.

    The agent chooses from high-level playbooks and records each action
    with a timestamp so that simulations can be replayed later. The
    implementation offers richer playbook metadata, dependency handling,
    and introspection utilities used by unit tests and prototypes.
    """

    version: str = "0.1.0"
    playbooks: dict[str, PlaybookDefinition] = field(default_factory=dict)
    history: list[dict[str, object]] = field(default_factory=list)
    next_id: int = 1

    def register_playbook(
        self,
        name: str,
        description: str,
        *,
        severity: str = "informational",
        channels: Iterable[str] | None = None,
        prerequisites: Iterable[str] | None = None,
        cooldown_seconds: int = 0,
        tags: Iterable[str] | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> None:
        """Register a playbook that can be executed by the agent."""

        definition = PlaybookDefinition(
            description=description,
            severity=severity,
            channels=tuple(channels or ()),
            prerequisites=tuple(prerequisites or ()),
            cooldown_seconds=int(cooldown_seconds),
            tags=tuple(dict.fromkeys(tags or ())),
            metadata=dict(metadata) if metadata else None,
        )
        self.playbooks[name] = definition

    def load_playbooks(self, path: str | Path) -> int:
        """Load playbooks from a JSON mapping and register them."""

        with Path(path).open("r", encoding="utf-8") as fh:
            payload = json.load(fh)

        items: Iterable[tuple[str, Mapping[str, object]]]
        if isinstance(payload, Mapping):
            items = payload.items()
        elif isinstance(payload, list):
            items = ((str(entry["name"]), entry) for entry in payload)
        else:
            raise TypeError("Unsupported playbook definition format")

        count = 0
        for name, record in items:
            self.playbooks[str(name)] = PlaybookDefinition.from_record(record)
            count += 1
        return count

    def save_playbooks(self, path: str | Path) -> None:
        """Persist registered playbooks to a JSON file."""

        serialised = {
            name: definition.to_record() for name, definition in self.playbooks.items()
        }
        with Path(path).open("w", encoding="utf-8") as fh:
            json.dump(serialised, fh, indent=2, sort_keys=True)

    def trigger(
        self,
        target: str,
        playbook: str,
        confidence: float = 0.0,
        *,
        note: str | None = None,
        additional_tags: Iterable[str] | None = None,
    ) -> dict[str, object]:
        """Record a countermeasure action."""

        if playbook not in self.playbooks:
            raise ValueError(f"Unknown playbook: {playbook}")

        definition = self.playbooks[playbook]

        if definition.prerequisites:
            executed = {entry["playbook"] for entry in self.history}
            missing = [p for p in definition.prerequisites if p not in executed]
            if missing:
                missing_list = ", ".join(missing)
                raise ValueError(
                    f"Playbook '{playbook}' prerequisites not satisfied: {missing_list}"
                )

        if definition.cooldown_seconds > 0:
            cooldown_delta = timedelta(seconds=definition.cooldown_seconds)
            now = datetime.utcnow()
            for entry in reversed(self.history):
                if entry["playbook"] == playbook:
                    last_used = datetime.fromisoformat(entry["timestamp"])
                    elapsed = now - last_used
                    if elapsed < cooldown_delta:
                        remaining = int((cooldown_delta - elapsed).total_seconds())
                        raise ValueError(
                            f"Playbook '{playbook}' is cooling down for {remaining} more seconds"
                        )
                    break

        tags = set(definition.tags)
        if additional_tags:
            tags.update(additional_tags)

        action = {
            "id": self.next_id,
            "timestamp": datetime.utcnow().isoformat(),
            "agent_version": self.version,
            "target": target,
            "playbook": playbook,
            "confidence": confidence,
            "tags": sorted(tags),
            "channels": list(definition.channels),
            "severity": definition.severity,
        }
        if definition.metadata:
            action["metadata"] = dict(definition.metadata)
        if note:
            action["note"] = note

        self.history.append(action)
        self.next_id += 1
        logging.info("Countermeasure applied: %r", action)
        return deepcopy(action)

    def list_playbooks(self) -> dict[str, dict[str, object]]:
        """Return a copy of registered playbooks as plain dictionaries."""

        return {name: definition.to_record() for name, definition in self.playbooks.items()}

    def deregister_playbook(self, name: str) -> bool:
        """Remove a playbook from the registry."""

        return self.playbooks.pop(name, None) is not None

    def get_history(
        self,
        playbook: str | None = None,
        target: str | None = None,
        *,
        since: datetime | str | None = None,
        until: datetime | str | None = None,
        tags: Iterable[str] | None = None,
        limit: int | None = None,
        reverse: bool = False,
    ) -> list[dict[str, object]]:
        """Return recorded actions with rich filtering options."""

        entries = list(self.history)
        if reverse:
            entries.reverse()
        if playbook is not None:
            entries = [a for a in entries if a["playbook"] == playbook]
        if target is not None:
            entries = [a for a in entries if a["target"] == target]

        if since is not None:
            boundary = self._coerce_datetime(since)
            entries = [a for a in entries if self._coerce_datetime(a["timestamp"]) >= boundary]
        if until is not None:
            boundary = self._coerce_datetime(until)
            entries = [a for a in entries if self._coerce_datetime(a["timestamp"]) <= boundary]

        if tags is not None:
            required = set(tags)
            entries = [a for a in entries if required.issubset(set(a.get("tags", ())))]

        if limit is not None:
            entries = entries[: int(limit)]

        return [deepcopy(entry) for entry in entries]

    def export_history(self, path: str | Path) -> None:
        """Serialize the action history to a JSON file."""

        with Path(path).open("w", encoding="utf-8") as fh:
            json.dump(self.history, fh, indent=2)

    def summarize_history(self) -> dict[str, dict[str, int] | int]:
        """Return aggregate counts by playbook and target."""

        summary: dict[str, dict[str, int] | int] = {
            "total_actions": len(self.history),
            "by_playbook": {},
            "by_target": {},
        }
        by_playbook = summary["by_playbook"]
        by_target = summary["by_target"]
        for entry in self.history:
            playbook = entry["playbook"]
            target = entry["target"]
            by_playbook[playbook] = by_playbook.get(playbook, 0) + 1
            by_target[target] = by_target.get(target, 0) + 1
        return summary

    def reset(self) -> None:
        """Clear the recorded action history and reset the action counter."""

        self.history.clear()
        self.next_id = 1

    @staticmethod
    def _coerce_datetime(value: datetime | str) -> datetime:
        """Convert strings or datetime objects into :class:`datetime`."""

        if isinstance(value, datetime):
            return value
        if isinstance(value, str):
            return datetime.fromisoformat(value)
        raise TypeError("Unsupported datetime value")
