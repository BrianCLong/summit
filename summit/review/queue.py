from __future__ import annotations
import json
from pathlib import Path
from typing import Optional, List
from dataclasses import asdict
from summit.review.models import DecisionPacket

class FileReviewQueue:
    def __init__(self, storage_path: Path):
        self.storage_path = storage_path
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self.queue_file = self.storage_path / "queue.jsonl"

    def enqueue(self, packet: DecisionPacket) -> None:
        # Append to file
        with open(self.queue_file, "a", encoding="utf-8") as f:
            data = asdict(packet)
            f.write(json.dumps(data) + "\n")

    def dequeue(self) -> Optional[DecisionPacket]:
        if not self.queue_file.exists():
            return None

        lines = self.queue_file.read_text(encoding="utf-8").splitlines()
        if not lines:
            return None

        first_line = lines[0]
        remaining = lines[1:]

        self.queue_file.write_text("\n".join(remaining) + ("\n" if remaining else ""), encoding="utf-8")

        data = json.loads(first_line)
        return DecisionPacket(**data)

    def peek(self) -> Optional[DecisionPacket]:
        if not self.queue_file.exists():
            return None
        lines = self.queue_file.read_text(encoding="utf-8").splitlines()
        if not lines:
            return None
        return DecisionPacket(**json.loads(lines[0]))
