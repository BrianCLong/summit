"""Turn-based simulation core with initiative and fog-of-war handling."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List
import random

from .map import Map
from .unit import Unit
from .ai import EnemyAI
from .analytics import Analytics

try:
    import matplotlib.pyplot as plt
except Exception:  # pragma: no cover - optional
    plt = None


@dataclass
class Simulation:
    game_map: Map
    units: List[Unit]
    ai: EnemyAI = field(default_factory=EnemyAI)
    max_turns: int = 20
    turn: int = 0
    analytics: Analytics = field(default_factory=Analytics)

    def step(self) -> None:
        alive_units = [u for u in self.units if u.alive]
        random.shuffle(alive_units)
        alive_units.sort(key=lambda u: u.initiative, reverse=True)
        for unit in alive_units:
            action, target = self.ai.decide(unit, self.game_map, self.units)
            if action == "attack" and target:
                victim = next(u for u in self.units if u.position == target and u.alive)
                victim.take_damage(5)
            elif action == "move" and target:
                unit.position = target
        self.turn += 1

    def is_over(self) -> bool:
        teams = {u.team for u in self.units if u.alive}
        return len(teams) <= 1 or self.turn >= self.max_turns

    def run(self, runs: int = 1) -> Analytics:
        for i in range(runs):
            while not self.is_over():
                self.step()
            self.analytics.record(self)
            if i < runs - 1:
                for u in self.units:
                    u.alive = True
                    u.hp = 10
                self.turn = 0
        return self.analytics

    def render(self) -> None:
        """Render final state using matplotlib if available."""
        if plt is None:
            raise ImportError("matplotlib is required for GUI rendering")
        grid = [[1 - cell for cell in row] for row in self.game_map.grid]
        plt.imshow(grid, cmap="gray", origin="lower")
        for u in self.units:
            if u.alive:
                plt.scatter([u.position[0]], [u.position[1]], c="b" if u.team == "blue" else "r")
        plt.show()
