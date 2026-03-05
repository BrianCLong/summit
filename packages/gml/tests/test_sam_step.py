import torch

from gml.optim import SAM


class TinyNet(torch.nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.fc = torch.nn.Linear(3, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.fc(x)


def _make_data() -> tuple[torch.Tensor, torch.Tensor]:
    x = torch.tensor(
        [[1.0, 0.0, 1.0], [0.0, 1.0, 1.0], [1.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
        dtype=torch.float32,
    )
    y = torch.tensor([[1.0], [1.0], [0.0], [0.0]], dtype=torch.float32)
    return x, y


def test_sam_optimizer_step_updates_parameters():
    torch.manual_seed(7)
    model = TinyNet()
    x, y = _make_data()

    optimizer = SAM(model.parameters(), torch.optim.SGD, lr=0.1, rho=0.05)
    criterion = torch.nn.BCEWithLogitsLoss()

    before = model.fc.weight.detach().clone()

    def closure() -> torch.Tensor:
        logits = model(x)
        loss = criterion(logits, y)
        optimizer.zero_grad()
        loss.backward()
        return loss

    optimizer.step(closure)

    after = model.fc.weight.detach().clone()
    assert not torch.allclose(before, after)


def test_sam_deterministic_with_fixed_seed():
    x, y = _make_data()
    criterion = torch.nn.BCEWithLogitsLoss()

    def run_once() -> torch.Tensor:
        torch.manual_seed(19)
        model = TinyNet()
        optimizer = SAM(model.parameters(), torch.optim.SGD, lr=0.1, rho=0.05)

        def closure() -> torch.Tensor:
            logits = model(x)
            loss = criterion(logits, y)
            optimizer.zero_grad()
            loss.backward()
            return loss

        for _ in range(4):
            optimizer.step(closure)

        return model.fc.weight.detach().clone()

    run_a = run_once()
    run_b = run_once()
    assert torch.allclose(run_a, run_b)
