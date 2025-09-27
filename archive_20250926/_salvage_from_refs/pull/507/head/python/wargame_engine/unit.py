"""Unit model with sensors and basic combat attributes."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Tuple
import random

from .sensors import Sensor

Coordinate = Tuple[int, int]


@dataclass
class Unit:
    name: str
    team: str
    position: Coordinate
    sensors: List[Sensor]
    hp: int = 10
    initiative: int = field(default_factory=lambda: random.randint(1, 20))
    alive: bool = True

    def take_damage(self, amount: int) -> None:
        self.hp -= amount
        if self.hp <= 0:
            self.alive = False

    def visible_enemies(self, others: List["Unit"], map_obj) -> List["Unit"]:
        enemies = []
        for o in others:
            if o.team == self.team or not o.alive:
                continue
            if any(sensor.detect(self.position, o.position) for sensor in self.sensors):
                if map_obj.los(self.position, o.position):
                    enemies.append(o)
        return enemies
