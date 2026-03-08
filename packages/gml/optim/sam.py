"""Sharpness-Aware Minimization (SAM) optimizer wrapper."""

from __future__ import annotations

from collections.abc import Iterable

import torch
from torch.optim import Optimizer


class SAM(Optimizer):
    """A lightweight clean-room SAM implementation.

    SAM performs a two-step update:
    1. Ascend to a local worst-case neighborhood around the current weights.
    2. Compute gradients at the perturbed point and apply the base optimizer step.
    """

    def __init__(
        self,
        params: Iterable[torch.nn.Parameter],
        base_optimizer_cls: type[Optimizer],
        rho: float = 0.05,
        adaptive: bool = False,
        **kwargs,
    ) -> None:
        if rho <= 0:
            raise ValueError("rho must be positive")

        params = list(params)
        defaults = dict(rho=rho, adaptive=adaptive, **kwargs)
        super().__init__(params, defaults)

        self.rho = rho
        self.adaptive = adaptive
        self.base_optimizer = base_optimizer_cls(self.param_groups, **kwargs)

    @torch.no_grad()
    def first_step(self) -> None:
        """Perturb parameters in gradient direction by rho-scaled norm."""

        grad_norm = self._grad_norm()
        if grad_norm == 0:
            return

        scale = self.rho / (grad_norm + 1e-12)
        for group in self.param_groups:
            for p in group["params"]:
                if p.grad is None:
                    continue
                weight = torch.abs(p) if self.adaptive else 1.0
                e_w = weight * p.grad * scale
                p.add_(e_w)
                self.state[p]["e_w"] = e_w

    @torch.no_grad()
    def second_step(self) -> None:
        """Restore parameters and run the wrapped optimizer step."""

        for group in self.param_groups:
            for p in group["params"]:
                if p.grad is None:
                    continue
                p.sub_(self.state[p].pop("e_w", 0.0))

        self.base_optimizer.step()

    @torch.no_grad()
    def step(self, closure=None):  # type: ignore[override]
        """Execute SAM with a closure that performs full forward/backward passes."""

        if closure is None:
            raise RuntimeError("SAM requires a closure for two-step optimization")

        with torch.enable_grad():
            loss = closure()

        self.first_step()
        self.zero_grad()

        with torch.enable_grad():
            closure()

        self.second_step()
        self.zero_grad()
        return loss

    def _grad_norm(self) -> torch.Tensor:
        grads = []
        shared_device = self.param_groups[0]["params"][0].device
        for group in self.param_groups:
            for p in group["params"]:
                if p.grad is None:
                    continue
                grad = (torch.abs(p) * p.grad) if self.adaptive else p.grad
                grads.append(grad.norm(p=2).to(shared_device))

        if not grads:
            return torch.tensor(0.0, device=shared_device)

        return torch.norm(torch.stack(grads), p=2)
