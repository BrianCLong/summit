"""
Image Deepfake Detector

Placeholder detector that returns stable responses for image inputs.
"""

import logging
from typing import Any, Dict

import torch

logger = logging.getLogger(__name__)


class ImageDetector:
    """Basic image detector placeholder."""

    def __init__(self, model: torch.nn.Module, device: str = "cuda" if torch.cuda.is_available() else "cpu"):
        self.model = model
        self.device = device
        self.model.to(self.device)
        self.model.eval()
        self.threshold = 0.5
        logger.info("ImageDetector initialized on %s", self.device)

    async def detect(self, media_data: bytes, enable_explanation: bool = False) -> Dict[str, Any]:
        # Use a trivial tensor representation to avoid heavyweight preprocessing
        tensor = torch.tensor([len(media_data)], dtype=torch.float32, device=self.device)

        with torch.no_grad():
            raw_score = torch.sigmoid(self.model(tensor)).item()

        is_synthetic = raw_score >= self.threshold
        result: Dict[str, Any] = {
            "is_synthetic": is_synthetic,
            "confidence_score": float(raw_score),
            "model_version": "v1.0.0",
        }

        if enable_explanation:
            result["explanation"] = {
                "method": "heuristic",
                "reasoning": "Size-based placeholder scoring",
            }

        return result
