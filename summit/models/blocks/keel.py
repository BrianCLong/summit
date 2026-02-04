from __future__ import annotations

import torch
from torch import nn


class KeelBlock(nn.Module):
    """
    Clean-room Keel block.

    Equation: x_{l+1} = LN_out(alpha * x_l + F(LN_in(x_l))).
    """

    def __init__(self, d_model: int, f: nn.Module, *, alpha: float) -> None:
        super().__init__()
        self.ln_in = nn.LayerNorm(d_model)
        self.ln_out = nn.LayerNorm(d_model)
        self.f = f
        self.alpha = float(alpha)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        y = self.f(self.ln_in(x))
        z = self.alpha * x + y
        return self.ln_out(z)
