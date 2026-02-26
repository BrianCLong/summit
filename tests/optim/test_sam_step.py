import pytest


torch = pytest.importorskip("torch")

from summit.optim.sam import SAM


def _run_steps(seed: int = 7, steps: int = 2) -> tuple[torch.Tensor, dict[str, float]]:
    torch.manual_seed(seed)
    model = torch.nn.Linear(4, 2, bias=False)
    optimizer = SAM(model.parameters(), torch.optim.SGD, lr=0.1, rho=0.05)

    x = torch.randn(8, 4)
    y = torch.randn(8, 2)
    loss_fn = torch.nn.MSELoss()

    initial = model.weight.detach().clone()

    for _ in range(steps):
        loss = loss_fn(model(x), y)
        loss.backward()
        optimizer.first_step(zero_grad=True)

        loss_perturbed = loss_fn(model(x), y)
        loss_perturbed.backward()
        optimizer.second_step(zero_grad=True)

    final = model.weight.detach().clone()
    metrics = {
        "delta_l2": (final - initial).norm(p=2).item(),
        "final_l2": final.norm(p=2).item(),
    }
    return final, metrics


def test_sam_two_step_update_changes_parameters() -> None:
    final, metrics = _run_steps(seed=11, steps=1)
    assert torch.isfinite(final).all()
    assert metrics["delta_l2"] > 0.0


def test_sam_update_is_deterministic_for_fixed_seed() -> None:
    final_a, metrics_a = _run_steps(seed=29, steps=3)
    final_b, metrics_b = _run_steps(seed=29, steps=3)

    assert torch.allclose(final_a, final_b, atol=0.0, rtol=0.0)
    assert metrics_a == metrics_b


def test_sam_handles_zero_gradient_step_without_key_errors() -> None:
    torch.manual_seed(3)
    model = torch.nn.Linear(2, 2, bias=False)
    optimizer = SAM(model.parameters(), torch.optim.SGD, lr=0.1, rho=0.05)
    loss_fn = torch.nn.MSELoss()
    x = torch.zeros(4, 2)
    target = model(x).detach()
    before = model.weight.detach().clone()

    loss = loss_fn(model(x), target)
    loss.backward()
    optimizer.first_step(zero_grad=True)

    loss_perturbed = loss_fn(model(x), target)
    loss_perturbed.backward()
    optimizer.second_step(zero_grad=True)

    after = model.weight.detach().clone()
    assert torch.allclose(before, after, atol=0.0, rtol=0.0)
