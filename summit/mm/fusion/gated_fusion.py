from dataclasses import dataclass
from typing import Union

try:
    import torch
    import torch.nn as nn
    HAS_TORCH = True
    BaseClass = nn.Module
except ImportError:
    HAS_TORCH = False
    BaseClass = object

@dataclass(frozen=True)
class FusionOutput:
    fused: object
    gate: Union[float, object]

if HAS_TORCH:
    class GatedFusionMLP(nn.Module):
        def __init__(self, hidden_dim: int = 64):
            super().__init__()
            self.net = nn.Sequential(
                nn.LazyLinear(hidden_dim),
                nn.ReLU(),
                nn.Linear(hidden_dim, 1),
                nn.Sigmoid()
            )

        def forward(self, x):
            return self.net(x)

class GatedFusion(BaseClass):
    def __init__(self, enabled: bool = False) -> None:
        if HAS_TORCH:
            super().__init__()
        self.enabled = enabled
        self.mlp = None
        if self.enabled and HAS_TORCH:
            self.mlp = GatedFusionMLP()

    def fuse(self, vision_repr, text_repr, discrepancy_repr) -> FusionOutput:
        if not self.enabled:
            return FusionOutput(fused=(vision_repr, text_repr), gate=0.0)

        gate_val = 0.5

        if HAS_TORCH and self.mlp is not None:
            if (isinstance(vision_repr, torch.Tensor) and
                isinstance(text_repr, torch.Tensor) and
                isinstance(discrepancy_repr, torch.Tensor)):

                # Concatenate along the last dimension
                inp = torch.cat([vision_repr, text_repr, discrepancy_repr], dim=-1)

                # Forward pass - returns Tensor, preserving gradients
                gate_val = self.mlp(inp)

        return FusionOutput(fused=(vision_repr, text_repr, discrepancy_repr), gate=gate_val)
