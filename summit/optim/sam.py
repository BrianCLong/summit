from __future__ import annotations

from collections.abc import Callable, Iterable
from typing import Any

import torch
from torch import Tensor
from torch.optim import Optimizer


class SAM(Optimizer):
    """Sharpness-Aware Minimization (SAM) optimizer wrapper."""

    def __init__(
        self,
        params: Iterable[torch.nn.Parameter],
        base_optimizer: type[Optimizer],
        rho: float = 0.05,
        adaptive: bool = False,
        **kwargs: Any,
    ) -> None:
        if rho < 0.0:
            raise ValueError(f"Invalid rho value: {rho}. rho must be >= 0.")

        defaults = {"rho": rho, "adaptive": adaptive, **kwargs}
        super().__init__(params, defaults)

        self.base_optimizer = base_optimizer(self.param_groups, **kwargs)
        self.param_groups = self.base_optimizer.param_groups
        self.defaults.update(self.base_optimizer.defaults)

    @torch.no_grad()
    def first_step(self, zero_grad: bool = False) -> None:
        grad_norm = self._grad_norm()
        if grad_norm.item() == 0.0:
            if zero_grad:
                self.zero_grad()
            return

        for group in self.param_groups:
            scale = group["rho"] / (grad_norm + 1e-12)
            adaptive = bool(group["adaptive"])
            for p in group["params"]:
                if p.grad is None:
                    continue
                e_w = (torch.pow(p, 2) if adaptive else 1.0) * p.grad * scale
                p.add_(e_w)
                self.state[p]["e_w"] = e_w

        if zero_grad:
            self.zero_grad()

    @torch.no_grad()
    def second_step(self, zero_grad: bool = False) -> None:
        for group in self.param_groups:
            for p in group["params"]:
                if p.grad is None:
                    continue
                perturbation = self.state[p].pop("e_w", None)
                if perturbation is not None:
                    p.sub_(perturbation)

        self.base_optimizer.step()

        if zero_grad:
            self.zero_grad()

    @torch.no_grad()
    def step(self, closure: Callable[[], Tensor] | None = None) -> Tensor:
        if closure is None:
            raise RuntimeError("SAM requires a closure for the two-step update.")

        closure = torch.enable_grad()(closure)

        loss = closure()
        self.first_step(zero_grad=True)
        closure()
        self.second_step()
        return loss

    def _grad_norm(self) -> Tensor:
        reference_param = self.param_groups[0]["params"][0]
        device = reference_param.device

        per_param_norms: list[Tensor] = []
        for group in self.param_groups:
            adaptive = bool(group["adaptive"])
            for p in group["params"]:
                if p.grad is None:
                    continue
                scaled_grad = (torch.pow(p, 2) if adaptive else 1.0) * p.grad
                per_param_norms.append(scaled_grad.norm(p=2).to(device))

        if not per_param_norms:
            return torch.zeros((), device=device)

        return torch.norm(torch.stack(per_param_norms), p=2)

    def load_state_dict(self, state_dict: dict[str, Any]) -> None:
        super().load_state_dict(state_dict)
        self.base_optimizer.param_groups = self.param_groups
