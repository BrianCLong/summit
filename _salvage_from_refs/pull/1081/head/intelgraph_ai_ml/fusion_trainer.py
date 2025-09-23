"""Training utilities for the fusion encoder.

The ``fusion_trainer`` module provides a simple command line interface that
fine‑tunes the modality weights used by :class:`FusionEncoder`.  Training data
is expected to consist of pairs of entity identifiers and a binary label
indicating whether the pair represents a valid link.  For each entity the
pre‑computed embeddings are looked up and the weights are optimised using a
contrastive loss.

The script is intentionally lightweight – it does not require a particular
ML framework beyond NumPy and optionally PyTorch if GPU acceleration is
available.  It is therefore suitable for quick experimentation or integrating
into larger pipelines.
"""

from __future__ import annotations

import argparse
import json
from collections.abc import Iterable

import numpy as np

from .fusion_encoder import FusionEncoder

try:  # Optional dependency for gradient optimisation
    import torch
except Exception:  # pragma: no cover
    torch = None  # type: ignore


def load_pairs(path: str) -> Iterable[tuple[str, str, int]]:
    """Yield ``(src, dst, label)`` triples from a JSON lines file."""

    with open(path, encoding="utf-8") as fh:
        for line in fh:
            item = json.loads(line)
            yield item["src"], item["dst"], int(item["label"])


def train(
    encoder: FusionEncoder, pairs: Iterable[tuple[str, str, int]], epochs: int = 5
) -> dict[str, float]:
    """Optimise modality weights based on labelled pairs."""

    weights = {"vision": 1.0, "text": 1.0, "graph": 1.0}
    if torch is None:  # pragma: no cover - executed without torch
        # Simple heuristic training when PyTorch is unavailable
        pos, neg = [], []
        for src, dst, label in pairs:
            emb_src = encoder.encode(cache_key=src)
            emb_dst = encoder.encode(cache_key=dst)
            sim = np.dot(emb_src, emb_dst) / (np.linalg.norm(emb_src) * np.linalg.norm(emb_dst))
            (pos if label else neg).append(sim)
        margin = np.mean(pos) - np.mean(neg)
        for key in weights:
            weights[key] += margin
        return weights

    # PyTorch based optimisation
    w = torch.tensor([1.0, 1.0, 1.0], requires_grad=True)
    opt = torch.optim.Adam([w], lr=0.01)
    for _ in range(epochs):
        for src, dst, label in pairs:
            emb_src = torch.tensor(encoder.encode(cache_key=src))
            emb_dst = torch.tensor(encoder.encode(cache_key=dst))
            sim = torch.nn.functional.cosine_similarity(emb_src, emb_dst, dim=0)
            loss = torch.nn.functional.mse_loss(sim, torch.tensor(float(label)))
            opt.zero_grad()
            loss.backward()
            opt.step()
    weights = {
        "vision": float(w[0].item()),
        "text": float(w[1].item()),
        "graph": float(w[2].item()),
    }
    return weights


if __name__ == "__main__":  # pragma: no cover - CLI utility
    parser = argparse.ArgumentParser(description="Fine‑tune fusion weights")
    parser.add_argument("pairs", help="JSONL file containing training pairs")
    parser.add_argument("--redis", dest="redis", help="Redis connection URL")
    parser.add_argument("--secret", dest="secret")
    args = parser.parse_args()

    key = args.secret.encode() if args.secret else None
    encoder = FusionEncoder(redis_url=args.redis, secret_key=key)
    learned = train(encoder, load_pairs(args.pairs))
    print(json.dumps(learned))
