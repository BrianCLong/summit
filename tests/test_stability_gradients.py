from __future__ import annotations

import pytest

torch = pytest.importorskip("torch")


def test_gradient_norms_propagate() -> None:
    torch.manual_seed(123)
    depth = 32
    width = 16
    layers = torch.nn.ModuleList([torch.nn.Linear(width, width) for _ in range(depth)])
    x = torch.randn(4, width, requires_grad=True)
    y = x
    for layer in layers:
        y = torch.nn.functional.silu(layer(y))
    loss = y.mean()
    loss.backward()
    grad_norms = [layer.weight.grad.norm().item() for layer in layers]
    assert all(torch.isfinite(torch.tensor(grad_norms)))
    assert min(grad_norms) > 1e-8
