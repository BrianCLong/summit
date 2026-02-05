from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional
import time

@dataclass
class ProvNode:
    step: str
    agent_id: Optional[str]
    input: Dict[str, Any]
    output: Dict[str, Any]
    timestamp: float = field(default_factory=time.time)
    confidence: Optional[float] = None

@dataclass
class DecisionProvenance:
    evidence_id: str
    timeline: List[ProvNode] = field(default_factory=list)

    def record_step(self, step: str, input: Dict[str, Any], output: Dict[str, Any], agent_id: str | None = None):
        """Records a step in the decision timeline."""
        self.timeline.append(ProvNode(
            step=step,
            agent_id=agent_id,
            input=input,
            output=output,
            confidence=output.get("confidence")
        ))

    def generate_report(self) -> Dict[str, Any]:
        """Generates a structured report of the decision timeline.
        Excludes timestamps to ensure deterministic output.
        """
        nodes = []
        for node in self.timeline:
            d = asdict(node)
            if "timestamp" in d:
                del d["timestamp"]
            nodes.append(d)

        return {
            "evidence_id": self.evidence_id,
            "step_count": len(self.timeline),
            "timeline": nodes
        }
