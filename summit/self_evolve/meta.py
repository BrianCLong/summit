from typing import List, Dict, Any

class MetaCognitionEngine:
    """
    Identifies capability gaps and emits 'capability gap' evidence.
    Inspired by Adaptive Orchestration meta-cognition engine (arXiv:2601.09742).
    """
    def __init__(self):
        self.gaps: List[Dict[str, Any]] = []

    def analyze_task(self, task: str, available_agents: List[str]) -> List[str]:
        # Simple gap detection for demonstration
        required_capabilities = []
        if "code" in task.lower() or "python" in task.lower():
            required_capabilities.append("coder")
        if "review" in task.lower():
            required_capabilities.append("reviewer")

        gaps = [cap for cap in required_capabilities if cap not in available_agents]

        for gap in gaps:
            self.gaps.append({
                "type": "capability_gap",
                "missing_specialist": gap,
                "task_context": task
            })

        return gaps

    def get_gap_evidence(self) -> List[Dict[str, Any]]:
        return self.gaps
