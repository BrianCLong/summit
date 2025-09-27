"""Leaderboard utilities for recording tournament results."""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List

from .harness import HarnessResult


LEADERBOARD_SCHEMA: Dict[str, Any] = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "Leakage Red-Team Tournament Leaderboard",
    "type": "object",
    "properties": {
        "runs": {
            "type": "array",
            "items": {
                "type": "object",
                "required": [
                    "run_id",
                    "timestamp",
                    "seed",
                    "agents",
                    "metrics",
                ],
                "properties": {
                    "run_id": {"type": "string"},
                    "timestamp": {"type": "string", "format": "date-time"},
                    "seed": {"type": "integer"},
                    "agents": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["name", "seed"],
                            "properties": {
                                "name": {"type": "string"},
                                "seed": {"type": "integer"},
                            },
                        },
                    },
                    "defenses": {
                        "type": "array",
                        "items": {"type": "string"},
                        "default": [],
                    },
                    "metrics": {
                        "type": "object",
                        "required": ["precision", "recall", "time_to_first_leak"],
                        "properties": {
                            "precision": {"type": "number", "minimum": 0, "maximum": 1},
                            "recall": {"type": "number", "minimum": 0, "maximum": 1},
                            "time_to_first_leak": {
                                "type": ["number", "null"],
                                "description": "Deterministic logical timestamp of first leak.",
                            },
                        },
                    },
                },
            },
        }
    },
    "required": ["runs"],
}


@dataclass
class LeaderboardEntry:
    run_id: str
    seed: int
    agents: List[Dict[str, Any]]
    defenses: List[str]
    metrics: Dict[str, Any]
    timestamp: str = datetime.utcnow().isoformat() + "Z"


class Leaderboard:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._data: Dict[str, Any] = {"runs": []}
        if path.exists():
            with path.open("r", encoding="utf-8") as handle:
                self._data = json.load(handle)

    def append(self, entry: LeaderboardEntry) -> None:
        self._data.setdefault("runs", []).append(asdict(entry))

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("w", encoding="utf-8") as handle:
            json.dump(self._data, handle, indent=2)

    @staticmethod
    def from_harness(
        run_id: str,
        seed: int,
        harness_result: HarnessResult,
        *,
        agents: Iterable[Any],
        defenses: Iterable[str],
    ) -> LeaderboardEntry:
        return LeaderboardEntry(
            run_id=run_id,
            seed=seed,
            agents=[{"name": agent.name, "seed": agent.seed} for agent in agents],
            defenses=list(defenses),
            metrics={
                "precision": harness_result.precision,
                "recall": harness_result.recall,
                "time_to_first_leak": harness_result.time_to_first_leak,
            },
        )
