"""Simple probabilistic decision tree for enemy AI."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple
import random

from .unit import Unit
from .map import Map


@dataclass
class EnemyAI:
    attack_prob: float = 0.7

    def decide(self, unit: Unit, game_map: Map, units: list[Unit]) -> Tuple[str, Tuple[int, int] | None]:
        visible = unit.visible_enemies(units, game_map)
        if visible:
            target = random.choice(visible)
            if random.random() < self.attack_prob:
                return "attack", target.position
        x, y = unit.position
        moves = [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
        random.shuffle(moves)
        for nx, ny in moves:
            if 0 <= nx < game_map.width and 0 <= ny < game_map.height and not game_map.is_blocked(nx, ny):
                return "move", (nx, ny)
        return "wait", None
