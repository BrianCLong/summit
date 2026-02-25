import pytest

torch = pytest.importorskip("torch")

from summit.optim.sam import SAM


def test_sam_first_and_second_step_match_expected_single_param_update():
    model = torch.nn.Linear(1, 1, bias=False)
    with torch.no_grad():
        model.weight.fill_(1.0)

    optimizer = SAM(model.parameters(), torch.optim.SGD, lr=0.1, rho=0.05)
    loss_fn = torch.nn.MSELoss()
    x = torch.tensor([[2.0]])
    y = torch.tensor([[0.0]])

    loss_fn(model(x), y).backward()
    before = model.weight.detach().clone()

    optimizer.first_step(zero_grad=True)
    perturbed = model.weight.detach().clone()
    assert torch.allclose(perturbed, torch.tensor([[1.05]]), atol=1e-6)

    loss_fn(model(x), y).backward()
    optimizer.second_step(zero_grad=True)
    after = model.weight.detach().clone()

    assert torch.allclose(before, torch.tensor([[1.0]]), atol=1e-6)
    assert torch.allclose(after, torch.tensor([[0.16]]), atol=1e-6)


def test_sam_step_requires_closure():
    model = torch.nn.Linear(1, 1, bias=False)
    optimizer = SAM(model.parameters(), torch.optim.SGD, lr=0.1)

    with pytest.raises(RuntimeError, match="closure"):
        optimizer.step()


def test_sam_step_is_deterministic_for_fixed_seed():
    x = torch.tensor([[1.0, -1.0, 0.5], [0.2, 0.4, -0.3]], dtype=torch.float32)
    y = torch.tensor([[0.1, -0.2], [0.5, 0.0]], dtype=torch.float32)

    def run() -> list[torch.Tensor]:
        torch.manual_seed(1337)
        model = torch.nn.Linear(3, 2)
        optimizer = SAM(model.parameters(), torch.optim.SGD, lr=0.05, rho=0.05)
        loss_fn = torch.nn.MSELoss()

        for _ in range(4):
            def closure() -> torch.Tensor:
                optimizer.zero_grad()
                loss = loss_fn(model(x), y)
                loss.backward()
                return loss

            optimizer.step(closure)

        return [param.detach().clone() for param in model.parameters()]

    first = run()
    second = run()

    assert len(first) == len(second)
    for left, right in zip(first, second, strict=True):
        assert torch.allclose(left, right, atol=0.0, rtol=0.0)


def test_first_step_noop_when_gradients_missing():
    model = torch.nn.Linear(1, 1, bias=False)
    optimizer = SAM(model.parameters(), torch.optim.SGD, lr=0.1)
    before = model.weight.detach().clone()

    optimizer.first_step()
    after = model.weight.detach().clone()

    assert torch.allclose(before, after, atol=0.0, rtol=0.0)
