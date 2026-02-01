from typing import Dict, Any

class StructureSimilarity:
    def compute_distance(self, skeleton_a: Dict[str, Any], skeleton_b: Dict[str, Any]) -> float:
        """
        Computes similarity distance between two narrative skeletons.
        Lower is more similar.
        """
        frame_a = skeleton_a.get("frame", {})
        frame_b = skeleton_b.get("frame", {})

        score = 0.0
        keys = ["problem_definition", "causal_interpretation", "moral_evaluation", "treatment_recommendation"]

        for k in keys:
            val_a = frame_a.get(k, "")
            val_b = frame_b.get(k, "")
            if val_a != val_b:
                score += 1.0

        return score / len(keys) if keys else 0.0
