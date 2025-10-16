"""Multimodal fusion encoder.

This module provides a :class:`FusionEncoder` that computes embeddings for
visual, textual and graph modalities and fuses them into a unified vector.
The design focuses on modularity – new modalities can be added by extending
:func:`FusionEncoder.encode` – and caching – encoded vectors are stored in
Redis using a fingerprint of the source content.

The implementation intentionally keeps external dependencies optional.  If a
particular backend such as ``transformers`` or ``torch_geometric`` is not
available the encoder will raise a clear ``ImportError`` when that modality is
used.  This keeps the module lightweight while allowing advanced setups to
plug in GPU‑accelerated models.
"""

from __future__ import annotations

import hashlib
import json
from collections.abc import Iterable
from dataclasses import dataclass, field
from typing import Any

import numpy as np

try:  # Redis is optional – the encoder still works without caching
    import redis
except Exception:  # pragma: no cover - exercised only when redis missing
    redis = None  # type: ignore

try:  # Optional cryptographic encryption of embeddings at rest
    from cryptography.fernet import Fernet
except Exception:  # pragma: no cover
    Fernet = None  # type: ignore


def _fingerprint(parts: Iterable[str]) -> str:
    """Return a stable fingerprint for the provided content parts."""

    h = hashlib.sha256()
    for part in parts:
        h.update(part.encode("utf-8"))
    return h.hexdigest()


@dataclass
class FusionEncoder:
    """Encode and fuse visual, textual and graph information.

    Parameters
    ----------
    redis_url:
        Optional Redis connection string.  When provided, fused embeddings are
        cached with a configurable TTL to avoid recomputation.
    ttl:
        Time‑to‑live for cache entries in seconds.  ``None`` disables expiry.
    secret_key:
        Optional key used to encrypt embeddings before storing them in Redis.
    """

    redis_url: str | None = None
    ttl: int = 3600
    secret_key: bytes | None = None
    _redis: redis.Redis | None = field(init=False, default=None)
    _fernet: Any | None = field(init=False, default=None)

    def __post_init__(self) -> None:  # pragma: no cover - trivial wiring
        if self.redis_url and redis:
            self._redis = redis.from_url(self.redis_url)
        if self.secret_key and Fernet:
            self._fernet = Fernet(self.secret_key)

    # ----- modality encoders -------------------------------------------------

    def _encode_text(self, text: str) -> np.ndarray:
        """Return a text embedding using MiniLM."""

        try:
            from sentence_transformers import SentenceTransformer
        except ImportError as exc:  # pragma: no cover
            raise ImportError(
                "sentence-transformers package is required for text encoding"
            ) from exc

        model = SentenceTransformer("all-MiniLM-L6-v2")
        return model.encode([text])[0]

    def _encode_vision(self, image: Any) -> np.ndarray:
        """Return a CLIP image embedding."""

        try:
            import torch
            from PIL import Image
            from transformers import CLIPModel, CLIPProcessor
        except ImportError as exc:  # pragma: no cover
            raise ImportError(
                "transformers and pillow packages are required for vision encoding"
            ) from exc

        if not isinstance(image, Image.Image):
            image = Image.open(image)
        processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        inputs = processor(images=image, return_tensors="pt")
        with torch.no_grad():  # type: ignore[name-defined]
            image_features = model.get_image_features(**inputs)
        return image_features[0].cpu().numpy()

    def _encode_graph(self, graph_data: Any) -> np.ndarray:
        """Encode graph structure using Node2Vec.

        ``graph_data`` is expected to be a NetworkX graph.  Only the structure
        is considered; node features are ignored.
        """

        try:
            import networkx as nx
            import torch
            from torch_geometric.nn import Node2Vec
        except ImportError as exc:  # pragma: no cover
            raise ImportError(
                "torch, torch_geometric and networkx are required for graph encoding"
            ) from exc

        if not isinstance(graph_data, nx.Graph):
            raise TypeError("graph_data must be a networkx.Graph instance")

        edge_index = torch.tensor(list(graph_data.edges)).t().contiguous()
        model = Node2Vec(edge_index, embedding_dim=128, walk_length=10, context_size=5)
        loader = model.loader(batch_size=128, shuffle=True)
        optimizer = torch.optim.Adam(list(model.parameters()), lr=0.01)
        model.train()
        for _ in range(1):  # minimal training
            for pos_rw, neg_rw in loader:
                optimizer.zero_grad()
                loss = model.loss(pos_rw, neg_rw)
                loss.backward()
                optimizer.step()
        model.eval()
        with torch.no_grad():
            embeddings = model.embedding.weight.cpu().numpy()
        # return mean embedding as representation
        return embeddings.mean(axis=0)

    # ----- fusion ------------------------------------------------------------

    def fuse(
        self,
        vision: np.ndarray | None = None,
        text: np.ndarray | None = None,
        graph: np.ndarray | None = None,
        weights: dict[str, float] | None = None,
    ) -> np.ndarray:
        """Fuse available modality embeddings using an attention weighted average."""

        vectors = []
        w = []
        weights = weights or {}
        if vision is not None:
            vectors.append(vision)
            w.append(weights.get("vision", 1.0))
        if text is not None:
            vectors.append(text)
            w.append(weights.get("text", 1.0))
        if graph is not None:
            vectors.append(graph)
            w.append(weights.get("graph", 1.0))
        if not vectors:
            raise ValueError("At least one modality must be provided")
        stacked = np.vstack([v for v in vectors])
        weights_arr = np.array(w).reshape(-1, 1)
        fused = np.sum(stacked * weights_arr, axis=0) / weights_arr.sum()
        # Ensure fixed dimensionality (1024) by padding or truncating
        if fused.shape[0] < 1024:
            fused = np.pad(fused, (0, 1024 - fused.shape[0]))
        elif fused.shape[0] > 1024:
            fused = fused[:1024]
        return fused

    # ----- public API -------------------------------------------------------

    def encode(
        self,
        *,
        text: str | None = None,
        image: Any | None = None,
        graph: Any | None = None,
        weights: dict[str, float] | None = None,
        cache_key: str | None = None,
    ) -> np.ndarray:
        """Encode inputs and return fused embedding.

        Parameters are optional; at least one must be supplied.  ``cache_key``
        should be a stable identifier of the entity being encoded (e.g. node
        id).  When provided and Redis is configured the fused embedding will be
        cached and retrieved transparently if the underlying content fingerprint
        has not changed.
        """

        parts = []
        vision_vec = text_vec = graph_vec = None
        if text is not None:
            parts.append(text)
            text_vec = self._encode_text(text)
        if image is not None:
            parts.append(getattr(image, "filename", "image"))
            vision_vec = self._encode_vision(image)
        if graph is not None:
            parts.append(json.dumps(sorted(graph.edges())))
            graph_vec = self._encode_graph(graph)
        fingerprint = _fingerprint(parts)
        if cache_key and self._redis:
            cached = self._redis.get(cache_key)
            if cached:
                data = cached
                if self._fernet:
                    data = self._fernet.decrypt(data)
                decoded = np.frombuffer(data, dtype=np.float32)
                meta = self._redis.get(f"{cache_key}:fp")
                if meta and meta.decode() == fingerprint:
                    return decoded
        fused = self.fuse(vision_vec, text_vec, graph_vec, weights)
        if cache_key and self._redis:
            data = fused.astype(np.float32).tobytes()
            if self._fernet:
                data = self._fernet.encrypt(data)
            if self.ttl:
                self._redis.setex(cache_key, self.ttl, data)
                self._redis.setex(f"{cache_key}:fp", self.ttl, fingerprint)
            else:
                self._redis.set(cache_key, data)
                self._redis.set(f"{cache_key}:fp", fingerprint)
        return fused
