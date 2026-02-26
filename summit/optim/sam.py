# summit/optim/sam.py
# Summit original clean-room implementation

import torch
from torch.optim import Optimizer
from typing import Callable, Iterable, Dict, Any


class SAM(Optimizer):
    def __init__(self, params: Iterable[torch.Tensor], base_optimizer: Callable[..., Optimizer], rho: float = 0.05, adaptive: bool = False, **kwargs: Any):
        if rho < 0.0:
            raise ValueError(f"Invalid rho, should be non-negative: {rho}")

        defaults = dict(rho=rho, adaptive=adaptive, **kwargs)
        super(SAM, self).__init__(params, defaults)

        self.base_optimizer = base_optimizer(self.param_groups, **kwargs)
        self.param_groups = self.base_optimizer.param_groups

    @torch.no_grad()
    def first_step(self, zero_grad: bool = False) -> None:
        grad_norm = self._grad_norm()
        for group in self.param_groups:
            scale = group["rho"] / (grad_norm + 1e-12)

            for p in group["params"]:
                if p.grad is None:
                    continue
                self.state[p]["old_p"] = p.data.clone()
                e_w = (torch.pow(p, 2) if group["adaptive"] else 1.0) * p.grad * scale
                p.add_(e_w)  # climb to the local maximum "strong" direction

        if zero_grad:
            self.zero_grad()

    @torch.no_grad()
    def second_step(self, zero_grad: bool = False) -> None:
        for group in self.param_groups:
            for p in group["params"]:
                if p.grad is None:
                    continue
                p.data.copy_(self.state[p]["old_p"])  # get back to "w" from "w + e(w)"

        self.base_optimizer.step()  # do the actual adpative step

        if zero_grad:
            self.zero_grad()

    def step(self, closure: Callable[[], float] = None) -> float:
        """
        Standard step implementation for SAM if closure is provided.
        Otherwise, call first_step and second_step separately in training loop.
        """
        if closure is None:
            raise ValueError("SAM requires a closure that returns the loss.")

        # closure should handle gradient computation
        loss = closure()
        self.first_step(zero_grad=True)
        closure()
        self.second_step()
        return loss

    def _grad_norm(self) -> torch.Tensor:
        shared_device = self.param_groups[0]["params"][0].device  # put everything on the same device, in case of model parallelism
        norm = torch.norm(
            torch.stack([
                ((torch.abs(p) if group["adaptive"] else 1.0) * p.grad).norm(p=2).to(shared_device)
                for group in self.param_groups
                for p in group["params"]
                if p.grad is not None
            ]),
            p=2
        )
        return norm
