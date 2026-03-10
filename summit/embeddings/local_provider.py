import hashlib
from typing import List

from summit.embeddings.base import EmbeddingProvider


class LocalEmbeddingProvider(EmbeddingProvider):
    def __init__(self, model_name: str = "summit-local-v1"):
        self.model_name = model_name
    def embed_text(self, text: str) -> list[float]:
        hash_digest = hashlib.sha256(text.encode("utf-8")).digest()
        return [float(b) / 255.0 for b in hash_digest]
    def get_fingerprint(self) -> str:
        return f"{self.model_name}-sha256-32"
