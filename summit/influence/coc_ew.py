from typing import List, Dict, Any
import math

class CoCAnalyzer:
    """
    Narrative “Change-of-Change” Early Warning (CoC-EW)
    Tracks narrative velocity and curvature.
    """
    def compute_metrics(self, time_slices: List[Dict[str, Any]]) -> Dict[str, float]:
        """
        Computes velocity (1st derivative) and curvature (2nd derivative)
        over a series of narrative cluster measurements.
        """
        if len(time_slices) < 3:
            return {"velocity": 0.0, "curvature": 0.0}

        # Simplified stub: assuming 'volume' as the primary metric
        v1 = time_slices[-1]["volume"] - time_slices[-2]["volume"]
        v2 = time_slices[-2]["volume"] - time_slices[-3]["volume"]

        velocity = v1
        curvature = v1 - v2

        return {
            "narrative_velocity": float(velocity),
            "narrative_curvature": float(curvature)
        }
