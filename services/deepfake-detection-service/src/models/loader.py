"""Simple model loader used for bootstrapping the API service."""

import asyncio
import logging
from typing import Dict, Optional

import torch

logger = logging.getLogger(__name__)


class _DummyDetectorModel(torch.nn.Module):
    def forward(self, x):  # type: ignore[override]
        # Produce a single scalar score per input element/batch
        if x.ndim == 1:
            return torch.zeros_like(x)
        batch_size = x.shape[0]
        return torch.zeros(batch_size, device=x.device, dtype=x.dtype)


class ModelLoader:
    """Loads and tracks detector models.

    The current implementation provides lightweight placeholder models so the
    API can start even when full production checkpoints are not available.
    """

    def __init__(self, model_storage_path: str):
        self.model_storage_path = model_storage_path
        self._models: Dict[str, torch.nn.Module] = {}
        logger.info("ModelLoader initialized with storage path %s", model_storage_path)

    async def load_model(self, model_name: str, version: Optional[str] = None) -> torch.nn.Module:
        # Simulate asynchronous model loading to keep the API non-blocking
        await asyncio.sleep(0)
        if model_name not in self._models:
            self._models[model_name] = _DummyDetectorModel()
            logger.info("Loaded placeholder model for %s (version=%s)", model_name, version or "default")
        return self._models[model_name]

    async def list_models(self):
        return [
            {"name": name, "version": "placeholder"}
            for name in self._models
        ]

    async def get_model_info(self, model_name: str):
        if model_name in self._models:
            return {"name": model_name, "version": "placeholder"}
        return None

    async def cleanup(self):
        self._models.clear()
        logger.info("ModelLoader cleaned up")
