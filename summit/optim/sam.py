"""Clean-room Sharpness-Aware Minimization (SAM) optimizer wrapper."""

from __future__ import annotations

from collections.abc import Callable, Iterable
from typing import Any

import torch
from torch import Tensor
from torch.optim import Optimizer


class SAM(Optimizer):
    """
    SAM optimizer that wraps a base optimizer with a two-step sharpness-aware update.

    Usage:
      1) Forward/backward pass.
      2) ``first_step(zero_grad=True)``.
      3) Forward/backward pass at perturbed weights.
      4) ``second_step(zero_grad=True)``.
    """

    def __init__(
        self,
        params: Iterable[Tensor] | Iterable[dict[str, Any]],
        base_optimizer: type[Optimizer],
        rho: float = 0.05,
        adaptive: bool = False,
        **kwargs: Any,
    ) -> None:
        if rho < 0.0:
            raise ValueError(f"rho must be non-negative, got {rho}")

        defaults = {"rho": rho, "adaptive": adaptive, **kwargs}
        super().__init__(params, defaults)

        self.base_optimizer = base_optimizer(self.param_groups, **kwargs)
        self.param_groups = self.base_optimizer.param_groups
        self.defaults.update(self.base_optimizer.defaults)
        self.state = self.base_optimizer.state

    @torch.no_grad()
    def first_step(self, zero_grad: bool = False) -> None:
        grad_norm = self._grad_norm()
        if grad_norm <= 0:
            if zero_grad:
                self.zero_grad()
            return

        for group in self.param_groups:
            scale = group["rho"] / (grad_norm + 1e-12)
            adaptive = bool(group["adaptive"])
            for param in group["params"]:
                if param.grad is None:
                    continue
                perturb = (torch.pow(param, 2) if adaptive else 1.0) * param.grad * scale
                param.add_(perturb)
                self.state[param]["e_w"] = perturb

        if zero_grad:
            self.zero_grad()

    @torch.no_grad()
    def second_step(self, zero_grad: bool = False) -> None:
        for group in self.param_groups:
            for param in group["params"]:
                if param.grad is None:
                    continue
                perturb = self.state[param].pop("e_w", None)
                if perturb is None:
                    continue
                param.sub_(perturb)

        self.base_optimizer.step()

        if zero_grad:
            self.zero_grad()

    @torch.no_grad()
    def step(self, closure: Callable[[], Tensor] | None = None) -> Tensor:
        if closure is None:
            raise RuntimeError("SAM requires closure for the two-step update")

        closure = torch.enable_grad()(closure)
        loss = closure()
        self.first_step(zero_grad=True)
        closure()
        self.second_step(zero_grad=True)
        return loss

    def _grad_norm(self) -> Tensor:
        norms: list[Tensor] = []
        for group in self.param_groups:
            adaptive = bool(group["adaptive"])
            for param in group["params"]:
                if param.grad is None:
                    continue
                grad = param.grad
                if adaptive:
                    grad = grad * param.abs()
                norms.append(grad.norm(p=2))

        if norms:
            return torch.norm(torch.stack(norms), p=2)

        # No gradients available; default to CPU scalar.
        return torch.tensor(0.0)
