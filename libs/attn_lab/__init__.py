"""Attention lab utilities for Summit."""

from .config import AttnLabConfig, AttnType
from .innovations import (
    AdaptiveTokenHeadAssigner,
    DiversityPreservationRegularizer,
    HybridAttentionRouter,
)
from .mhla import (
    linear_attention,
    mhla_linear_attention,
    softmax_attention,
)

__all__ = [
    'AdaptiveTokenHeadAssigner',
    'AttnLabConfig',
    'AttnType',
    'DiversityPreservationRegularizer',
    'HybridAttentionRouter',
    'linear_attention',
    'mhla_linear_attention',
    'softmax_attention',
]
