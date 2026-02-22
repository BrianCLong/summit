from __future__ import annotations

import pytest

torch = pytest.importorskip("torch")

from summit.models.blocks.keel import KeelBlock


def test_keel_block_shape_and_determinism() -> None:
    torch.manual_seed(0)
    d_model = 8
    module = KeelBlock(d_model, torch.nn.Linear(d_model, d_model), alpha=2.0)
    x = torch.randn(2, 4, d_model)
    y1 = module(x)
    y2 = module(x)
    assert y1.shape == x.shape
    assert torch.allclose(y1, y2)


def test_keel_block_outputs_finite() -> None:
    torch.manual_seed(1)
    d_model = 4
    module = KeelBlock(d_model, torch.nn.Linear(d_model, d_model), alpha=1.0)
    x = torch.randn(3, 2, d_model)
    y = module(x)
    assert torch.isfinite(y).all()
