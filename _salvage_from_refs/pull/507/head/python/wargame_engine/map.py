"""Map handling with JSON and PNG tile imports and line-of-sight checks."""

from __future__ import annotations

from dataclasses import dataclass
import json
from typing import List, Tuple

try:
    from PIL import Image
except ImportError:  # pragma: no cover - optional dependency
    Image = None

Coordinate = Tuple[int, int]


def bresenham(start: Coordinate, end: Coordinate):
    """Yield coordinates on a grid line from start to end using Bresenham's algorithm."""
    x0, y0 = start
    x1, y1 = end
    dx = abs(x1 - x0)
    dy = -abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx + dy
    while True:
        yield x0, y0
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x0 += sx
        if e2 <= dx:
            err += dx
            y0 += sy


@dataclass
class Map:
    grid: List[List[int]]  # 0 open, 1 blocked

    @classmethod
    def from_json(cls, path: str) -> "Map":
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls(data["tiles"])

    @classmethod
    def from_png(cls, path: str) -> "Map":
        if Image is None:
            raise ImportError("Pillow is required for PNG map loading")
        img = Image.open(path).convert("L")
        data = list(img.getdata())
        width, height = img.size
        grid = [
            [0 if data[y * width + x] > 128 else 1 for x in range(width)]
            for y in range(height)
        ]
        return cls(grid)

    @property
    def width(self) -> int:
        return len(self.grid[0])

    @property
    def height(self) -> int:
        return len(self.grid)

    def is_blocked(self, x: int, y: int) -> bool:
        return self.grid[y][x] == 1

    def los(self, start: Coordinate, end: Coordinate) -> bool:
        """Return True if line of sight exists between start and end coordinates."""
        for x, y in bresenham(start, end):
            if (x, y) not in (start, end) and self.is_blocked(x, y):
                return False
        return True
