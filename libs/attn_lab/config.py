"""Configuration surface for attention lab experiments."""

from dataclasses import dataclass
from enum import Enum


class AttnType(str, Enum):
    SOFTMAX = 'softmax'
    LINEAR = 'linear'
    MHLA = 'mhla'


@dataclass(frozen=True)
class AttnLabConfig:
    attn_type: AttnType = AttnType.SOFTMAX
    num_token_heads: int = 4
    feature_map: str = 'elu+1'
    chunkwise: bool = False
    causal: bool = False
    chunk_size: int = 256
    use_fast_path: bool = False
