"""
Ensemble detector that combines results from individual modality detectors.
"""

import logging
from typing import Any, Dict, Iterable, List

logger = logging.getLogger(__name__)


class EnsembleDetector:
    """Aggregate detector that averages scores from multiple detectors."""

    def __init__(self, detectors: Iterable[Any]):
        self.detectors = list(detectors)
        logger.info("EnsembleDetector initialized with %d detectors", len(self.detectors))

    async def detect(self, media_data: bytes, enable_explanation: bool = False) -> Dict[str, Any]:
        if not self.detectors:
            raise ValueError("No detectors configured for ensemble")

        scores: List[float] = []
        explanations: List[Dict[str, Any]] = []

        for detector in self.detectors:
            result = await detector.detect(media_data, enable_explanation=enable_explanation)
            scores.append(float(result.get("confidence_score", 0.0)))
            if enable_explanation and result.get("explanation"):
                explanations.append(result["explanation"])

        avg_score = sum(scores) / len(scores)
        is_synthetic = avg_score >= 0.5

        response: Dict[str, Any] = {
            "is_synthetic": is_synthetic,
            "confidence_score": avg_score,
            "model_version": "ensemble-1.0.0",
        }

        if enable_explanation:
            response["explanation"] = {
                "method": "average",
                "combined": explanations,
            }

        return response
