from typing import List, Dict, Any, Optional

class SpecialistRegistry:
    def __init__(self):
        self.specialists = {
            "coder": {"id": "coder", "capability": "writing_code"},
            "researcher": {"id": "researcher", "capability": "gathering_info"},
            "reviewer": {"id": "reviewer", "capability": "policy_validation"}
        }

class ConciergeRouter:
    def __init__(self, registry: SpecialistRegistry, max_hires: int = 4):
        self.registry = registry
        self.max_hires = max_hires
        self.active_hires = []

    def hire_specialist(self, capability: str) -> Optional[Dict[str, Any]]:
        if len(self.active_hires) >= self.max_hires:
            # LRU Eviction
            evicted = self.active_hires.pop(0)
            print(f"Evicting specialist: {evicted['id']}")

        for s in self.registry.specialists.values():
            if s["capability"] == capability:
                self.active_hires.append(s)
                return s
        return None

class MetaCognitionEngine:
    def detect_gap(self, trace: List[Dict[str, Any]]) -> Optional[str]:
        # Simple heuristic for MWS
        for entry in trace:
            if "error" in entry and "not supported" in entry["error"]:
                return "capability_gap"
        return None
