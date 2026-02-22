"""Attention lab utilities for Summit."""

from .config import AttnLabConfig, AttnType
from .mhla import (
    linear_attention,
    mhla_linear_attention,
    softmax_attention,
)
from .innovations import (
    AdaptiveTokenHeadAssigner,
    DiversityPreservationRegularizer,
    HybridAttentionRouter,
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
