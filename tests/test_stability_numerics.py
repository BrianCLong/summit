from __future__ import annotations

import pytest

torch = pytest.importorskip("torch")


def assert_all_finite(tensor: torch.Tensor, name: str) -> None:
    if not torch.isfinite(tensor).all():
        raise AssertionError(f"Non-finite detected in {name}")


def test_forward_backward_all_finite_toy_deep() -> None:
    torch.manual_seed(0)
    x = torch.randn(2, 32, requires_grad=True)
    layers = [torch.nn.Linear(32, 32) for _ in range(48)]
    y = x
    for layer in layers:
        y = torch.nn.functional.silu(layer(y))
    loss = y.pow(2).mean()
    loss.backward()
    assert_all_finite(loss.detach(), "loss")
    assert_all_finite(x.grad.detach(), "x.grad")
