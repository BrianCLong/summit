from typing import Any, Dict, List

from summit.evidence.run_bundle import RunBundle


class Replayer:
    def __init__(self, bundle: RunBundle):
        self.bundle = bundle
        self.cursor = 0

    def next_event(self) -> dict[str, Any]:
        if self.cursor >= len(self.bundle.events):
            raise StopIteration
        event = self.bundle.events[self.cursor]
        self.cursor += 1
        return event
