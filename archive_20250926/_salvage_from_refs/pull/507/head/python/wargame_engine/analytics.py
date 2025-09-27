"""Collect and summarise simulation statistics."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List


@dataclass
class Analytics:
    durations: List[int] = field(default_factory=list)
    blue_casualties: List[int] = field(default_factory=list)
    red_casualties: List[int] = field(default_factory=list)
    blue_wins: int = 0
    red_wins: int = 0

    def record(self, simulation) -> None:
        self.durations.append(simulation.turn)
        blue_dead = sum(1 for u in simulation.units if u.team == "blue" and not u.alive)
        red_dead = sum(1 for u in simulation.units if u.team == "red" and not u.alive)
        self.blue_casualties.append(blue_dead)
        self.red_casualties.append(red_dead)
        if red_dead == len([u for u in simulation.units if u.team == "red"]):
            self.blue_wins += 1
        elif blue_dead == len([u for u in simulation.units if u.team == "blue"]):
            self.red_wins += 1

    def summary(self) -> dict:
        runs = len(self.durations)
        return {
            "runs": runs,
            "avg_duration": sum(self.durations) / runs if runs else 0,
            "avg_blue_casualties": sum(self.blue_casualties) / runs if runs else 0,
            "avg_red_casualties": sum(self.red_casualties) / runs if runs else 0,
            "blue_win_rate": self.blue_wins / runs if runs else 0,
            "red_win_rate": self.red_wins / runs if runs else 0,
        }
