"""
Audio Deepfake Detector

Lightweight placeholder detector for audio deepfake detection.
"""

import logging
from typing import Any, Dict, List

import torch

logger = logging.getLogger(__name__)


class AudioDetector:
    """Basic audio deepfake detector placeholder."""

    def __init__(self, model: torch.nn.Module, device: str = "cuda" if torch.cuda.is_available() else "cpu"):
        self.model = model
        self.device = device
        self.model.to(self.device)
        self.model.eval()
        self.threshold = 0.5
        logger.info("AudioDetector initialized on %s", self.device)

    async def detect(self, media_data: bytes, enable_explanation: bool = False) -> Dict[str, Any]:
        """Run a minimal detection pass returning a deterministic score."""
        # Convert bytes length into a simple feature to keep behavior deterministic
        tensor = torch.tensor([len(media_data)], dtype=torch.float32, device=self.device)

        with torch.no_grad():
            raw_score = torch.sigmoid(self.model(tensor)).item()

        is_synthetic = raw_score >= self.threshold

        result: Dict[str, Any] = {
            "is_synthetic": is_synthetic,
            "confidence_score": float(raw_score),
            "model_version": "v1.0.0",
            "segment_scores": self._segment_scores(raw_score),
        }

        if enable_explanation:
            result["explanation"] = {
                "method": "heuristic",
                "reasoning": "Length-based placeholder scoring",
            }

        return result

    def _segment_scores(self, score: float) -> List[Dict[str, float]]:
        # Return a single segment score to satisfy the API contract
        return [{"segment": 0, "score": float(score)}]
