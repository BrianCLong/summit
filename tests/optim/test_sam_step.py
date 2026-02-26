import torch
import torch.nn as nn
from summit.optim.sam import SAM


def test_sam_step_execution():
    """Verify that SAM can perform a step on a simple linear model."""
    model = nn.Linear(10, 1)
    base_optimizer = torch.optim.SGD
    optimizer = SAM(model.parameters(), base_optimizer, lr=0.1, rho=0.05)

    input_data = torch.randn(8, 10)
    target = torch.randn(8, 1)
    criterion = nn.MSELoss()

    # First step
    def closure():
        optimizer.zero_grad()
        output = model(input_data)
        loss = criterion(output, target)
        loss.backward()
        return loss

    initial_params = [p.clone() for p in model.parameters()]
    optimizer.step(closure)
    updated_params = [p.clone() for p in model.parameters()]

    # Verify that parameters were updated
    for p_init, p_upd in zip(initial_params, updated_params):
        assert not torch.equal(p_init, p_upd)


def test_sam_determinism():
    """Verify that SAM is deterministic across two identical runs."""
    torch.manual_seed(42)
    model1 = nn.Linear(5, 1)
    torch.manual_seed(42)
    model2 = nn.Linear(5, 1)

    # Ensure models are identical
    for p1, p2 in zip(model1.parameters(), model2.parameters()):
        assert torch.equal(p1, p2)

    base_optimizer = torch.optim.SGD
    opt1 = SAM(model1.parameters(), base_optimizer, lr=0.1, rho=0.05)
    opt2 = SAM(model2.parameters(), base_optimizer, lr=0.1, rho=0.05)

    input_data = torch.randn(4, 5)
    target = torch.randn(4, 1)
    criterion = nn.MSELoss()

    def step(model, optimizer):
        def closure():
            optimizer.zero_grad()
            output = model(input_data)
            loss = criterion(output, target)
            loss.backward()
            return loss
        optimizer.step(closure)

    step(model1, opt1)
    step(model2, opt2)

    # Verify that parameters are identical after one step
    for p1, p2 in zip(model1.parameters(), model2.parameters()):
        assert torch.allclose(p1, p2, atol=1e-7)


def test_asam_step():
    """Verify that ASAM (adaptive mode) runs without error."""
    model = nn.Linear(10, 1)
    base_optimizer = torch.optim.SGD
    optimizer = SAM(model.parameters(), base_optimizer, lr=0.1, rho=0.05, adaptive=True)

    input_data = torch.randn(8, 10)
    target = torch.randn(8, 1)
    criterion = nn.MSELoss()

    def closure():
        optimizer.zero_grad()
        output = model(input_data)
        loss = criterion(output, target)
        loss.backward()
        return loss

    optimizer.step(closure)
    # If it finishes, it's successful for this smoke test
