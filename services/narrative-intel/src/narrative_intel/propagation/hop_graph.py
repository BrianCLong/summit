from typing import List, Dict, Any

class HopGraphBuilder:
    def reconstruct_path(self, seed_url: str, current_url: str) -> List[str]:
        """
        Reconstructs the propagation path from seed to current.
        """
        # Placeholder
        return [seed_url, "intermediate.com", current_url]

    def calculate_laundering_score(self, path: List[str]) -> float:
        """
        Calculates laundering score based on hop depth and domain types.
        """
        return len(path) * 0.1
