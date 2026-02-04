import json
import os
from typing import Any, Dict, Iterable

from .base import Collector


class MockCollector(Collector):
    name: str = "collector.mock"

    def __init__(self, fixtures_path: str):
        self.fixtures_path = fixtures_path

    def collect(self) -> Iterable[dict[str, Any]]:
        if not os.path.exists(self.fixtures_path):
            return []

        with open(self.fixtures_path) as f:
            for line in f:
                if line.strip():
                    yield json.loads(line)
