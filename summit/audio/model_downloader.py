import logging
from pathlib import Path
from typing import List, Optional
from .model_cache_policy import ModelCachePolicy

logger = logging.getLogger(__name__)

class Qwen3ModelDownloader:
    """
    Downloader for Qwen3-TTS models with allowlist enforcement and canonical path policy.
    """
    def __init__(self, policy: ModelCachePolicy, allowlist: Optional[List[str]] = None):
        self.policy = policy
        self.allowlist = allowlist or ["Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice"]

    def download(self, model_id: str, revision: Optional[str] = None) -> Path:
        # Supply chain security: reject models not on the allowlist
        if not any(pattern in model_id for pattern in self.allowlist):
            raise ValueError(f"Model {model_id} is not in the allowlist. Access denied by policy.")

        target_dir = self.policy.qwen3_tts_dir(model_id.split("/")[-1])

        # Canonical folder policy:downloader only writes to the sanctioned model cache
        logger.info(f"Downloading {model_id} (revision: {revision or 'main'}) to {target_dir}")
        target_dir.mkdir(parents=True, exist_ok=True)

        # Placeholder for actual download logic (pinned revisions, checksum validation)
        # For now, we record the intent and ensure the directory exists.

        return target_dir
