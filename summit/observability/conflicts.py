from dataclasses import dataclass, field
from typing import List, Optional
import time

@dataclass
class ConflictRecord:
    conflict_id: str
    agents_involved: List[str]
    description: str
    resolution_method: str
    winner_agent: Optional[str]
    reasoning: str
    timestamp: float = field(default_factory=time.time)

@dataclass
class ConflictLog:
    conflicts: List[ConflictRecord] = field(default_factory=list)

    def log_conflict(self, conflict_id: str, agents: List[str], description: str,
                     resolution_method: str, winner: str | None, reasoning: str):
        self.conflicts.append(ConflictRecord(
            conflict_id, agents, description, resolution_method, winner, reasoning
        ))

    def get_summary(self) -> str:
        return f"Total Conflicts: {len(self.conflicts)}. " + \
               ", ".join([f"{c.conflict_id}: {c.resolution_method}" for c in self.conflicts])
