"""Sensor models for optical, thermal, and acoustic detection."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple
import math
import random

Coordinate = Tuple[int, int]


@dataclass
class Sensor:
    range: int
    probability: float = 1.0

    def detect(self, own: Coordinate, target: Coordinate) -> bool:
        dist = math.dist(own, target)
        if dist > self.range:
            return False
        return random.random() < self.probability


class OpticalSensor(Sensor):
    pass


class ThermalSensor(Sensor):
    pass


class AcousticSensor(Sensor):
    pass
