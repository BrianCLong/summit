"""Summit-specific extensions beyond MHLA."""

from __future__ import annotations

from dataclasses import dataclass

import torch
from torch import Tensor


@dataclass
class AdaptiveTokenHeadAssigner:
    num_token_heads: int
    top_k: int = 1
    use_static_fallback: bool = True

    def assign(self, tokens: Tensor) -> Tensor:
        if self.use_static_fallback:
            seq_len = tokens.shape[1]
            groups = torch.arange(seq_len, device=tokens.device) % self.num_token_heads
            return groups.unsqueeze(0).expand(tokens.shape[0], -1)

        logits = torch.einsum('bsd,hd->bsh', tokens, self._head_embeddings(tokens))
        topk = torch.topk(logits, k=self.top_k, dim=-1)
        assignment = topk.indices
        return assignment

    def _head_embeddings(self, tokens: Tensor) -> Tensor:
        head_dim = tokens.shape[-1]
        base = torch.linspace(-1, 1, steps=self.num_token_heads, device=tokens.device)
        return torch.einsum('h,d->hd', base, torch.ones(head_dim, device=tokens.device))


@dataclass
class DiversityPreservationRegularizer:
    epsilon: float = 1e-6

    def metrics(self, context_vectors: Tensor) -> dict[str, float]:
        flattened = context_vectors.flatten(0, 1)
        cov = torch.matmul(flattened.t(), flattened) / (flattened.shape[0] + self.epsilon)
        singular_values = torch.linalg.svdvals(cov)
        entropy = self._entropy(singular_values)
        rank = torch.sum(singular_values > self.epsilon).item()
        return {
            'singular_entropy': float(entropy),
            'effective_rank': float(rank),
        }

    def loss(self, context_vectors: Tensor) -> Tensor:
        metrics = self.metrics(context_vectors)
        return torch.tensor(1.0 / (metrics['singular_entropy'] + self.epsilon))

    def _entropy(self, singular_values: Tensor) -> Tensor:
        normalized = singular_values / (singular_values.sum() + self.epsilon)
        return -torch.sum(normalized * torch.log(normalized + self.epsilon))


@dataclass
class HybridAttentionRouter:
    total_layers: int
    schedule: list[str] | None = None

    def resolve_schedule(self) -> list[str]:
        if self.schedule:
            return self.schedule
        split = max(1, self.total_layers // 3)
        return ['linear'] * (self.total_layers - split) + ['softmax'] * split

    def autotune(self, latency_budget_ms: float, vram_budget_mb: float) -> dict[str, float]:
        schedule = self.resolve_schedule()
        linear_layers = schedule.count('linear')
        softmax_layers = schedule.count('softmax')
        return {
            'latency_budget_ms': latency_budget_ms,
            'vram_budget_mb': vram_budget_mb,
            'linear_layers': float(linear_layers),
            'softmax_layers': float(softmax_layers),
        }
