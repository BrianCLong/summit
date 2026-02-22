"""Reference MHLA-style linear attention implementations."""

from __future__ import annotations

from typing import Callable

import torch
from torch import Tensor


def _feature_map(name: str) -> Callable[[Tensor], Tensor]:
    if name == 'elu+1':
        return lambda x: torch.nn.functional.elu(x) + 1
    if name == 'relu':
        return torch.nn.functional.relu
    if name == 'exp-approx':
        return lambda x: torch.exp(torch.clamp(x, max=5))
    raise ValueError(f'Unsupported feature_map: {name}')


def softmax_attention(query: Tensor, key: Tensor, value: Tensor, *, causal: bool) -> Tensor:
    scale = query.shape[-1] ** -0.5
    scores = torch.matmul(query, key.transpose(-2, -1)) * scale
    if causal:
        seq_len = scores.shape[-1]
        mask = torch.tril(torch.ones((seq_len, seq_len), device=scores.device))
        scores = scores.masked_fill(mask == 0, float('-inf'))
    weights = torch.nn.functional.softmax(scores, dim=-1)
    return torch.matmul(weights, value)


def linear_attention(
    query: Tensor,
    key: Tensor,
    value: Tensor,
    *,
    feature_map: str = 'elu+1',
    causal: bool = False,
    eps: float = 1e-6,
) -> Tensor:
    phi = _feature_map(feature_map)
    q = phi(query)
    k = phi(key)

    if not causal:
        kv = torch.einsum('bsd,bse->bde', k, value)
        z = 1.0 / (torch.einsum('bsd,bd->bs', q, k.sum(dim=1)) + eps)
        output = torch.einsum('bsd,bde,bs->bse', q, kv, z)
        return output

    k_cum = torch.cumsum(k, dim=1)
    kv_cum = torch.cumsum(torch.einsum('bsd,bse->bsde', k, value), dim=1)
    z = 1.0 / (torch.einsum('bsd,bsd->bs', q, k_cum) + eps)
    output = torch.einsum('bsd,bsde,bs->bse', q, kv_cum, z)
    return output


def mhla_linear_attention(
    query: Tensor,
    key: Tensor,
    value: Tensor,
    *,
    num_token_heads: int,
    feature_map: str = 'elu+1',
    causal: bool = False,
    chunkwise: bool = False,
    chunk_size: int = 256,
) -> Tensor:
    seq_len = query.shape[1]
    device = query.device
    token_groups = torch.arange(seq_len, device=device) % num_token_heads
    outputs = torch.zeros_like(value)

    for head_idx in range(num_token_heads):
        positions = torch.nonzero(token_groups == head_idx, as_tuple=False).squeeze(-1)
        if positions.numel() == 0:
            continue
        q_slice = query.index_select(1, positions)
        k_slice = key.index_select(1, positions)
        v_slice = value.index_select(1, positions)

        if chunkwise and causal:
            head_output = _chunkwise_linear_attention(
                q_slice,
                k_slice,
                v_slice,
                feature_map=feature_map,
                chunk_size=chunk_size,
            )
        else:
            head_output = linear_attention(
                q_slice,
                k_slice,
                v_slice,
                feature_map=feature_map,
                causal=causal,
            )

        outputs.index_copy_(1, positions, head_output)

    return outputs


def _chunkwise_linear_attention(
    query: Tensor,
    key: Tensor,
    value: Tensor,
    *,
    feature_map: str,
    chunk_size: int,
    eps: float = 1e-6,
) -> Tensor:
    phi = _feature_map(feature_map)
    q = phi(query)
    k = phi(key)
    seq_len = q.shape[1]

    outputs = []
    k_cum = torch.zeros((q.shape[0], q.shape[2]), device=q.device)
    kv_cum = torch.zeros((q.shape[0], q.shape[2], value.shape[2]), device=q.device)

    for start in range(0, seq_len, chunk_size):
        end = min(start + chunk_size, seq_len)
        q_chunk = q[:, start:end]
        k_chunk = k[:, start:end]
        v_chunk = value[:, start:end]

        k_cum = k_cum + k_chunk.sum(dim=1)
        kv_cum = kv_cum + torch.einsum('bsd,bse->bde', k_chunk, v_chunk)
        z = 1.0 / (torch.einsum('bsd,bd->bs', q_chunk, k_cum) + eps)
        chunk_out = torch.einsum('bsd,bde,bs->bse', q_chunk, kv_cum, z)
        outputs.append(chunk_out)

    return torch.cat(outputs, dim=1)
