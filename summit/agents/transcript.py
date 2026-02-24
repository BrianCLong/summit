from __future__ import annotations

from dataclasses import dataclass
from typing import Any


def normalize_slug(value: str) -> str:
    lowered = value.lower()
    chars: list[str] = []
    for char in lowered:
        if char.isalnum():
            chars.append(char)
        elif chars and chars[-1] != "-":
            chars.append("-")
    slug = "".join(chars).strip("-")
    return slug or "task"


@dataclass(frozen=True)
class TranscriptEvent:
    evidence_id: str
    event_type: str
    payload: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "evidence_id": self.evidence_id,
            "event_type": self.event_type,
            "payload": self.payload,
        }


class Transcript:
    """Append-only transcript with deterministic evidence IDs."""

    def __init__(self, task_slug: str):
        self._slug = normalize_slug(task_slug)
        self._counter = 0
        self._events: list[TranscriptEvent] = []

    def add_event(self, event_type: str, payload: dict[str, Any]) -> str:
        self._counter += 1
        evidence_id = f"EVID:{self._slug}:{self._counter:04d}"
        self._events.append(TranscriptEvent(evidence_id, event_type, payload))
        return evidence_id

    @property
    def evidence_ids(self) -> list[str]:
        return [event.evidence_id for event in self._events]

    @property
    def events(self) -> list[dict[str, Any]]:
        return [event.to_dict() for event in self._events]
