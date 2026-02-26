# summit/training/loop.py
# Summit original clean-room implementation

import torch
import torch.nn as nn
from typing import Any, Dict, Callable
from summit.optim.sam import SAM

def training_loop(
    model: nn.Module,
    dataloader: Any,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer,
    epochs: int = 1,
    device: str = "cpu"
) -> Dict[str, Any]:
    """
    Standard training loop with optional SAM support.
    """
    model.to(device)
    model.train()

    metrics = {"loss_history": []}

    for epoch in range(epochs):
        epoch_loss = 0.0
        for batch_idx, (data, target) in enumerate(dataloader):
            data, target = data.to(device), target.to(device)

            if isinstance(optimizer, SAM):
                # SAM two-step update
                def closure():
                    optimizer.zero_grad()
                    output = model(data)
                    loss = criterion(output, target)
                    loss.backward()
                    return loss

                loss = optimizer.step(closure)
            else:
                # Standard update
                optimizer.zero_grad()
                output = model(data)
                loss = criterion(output, target)
                loss.backward()
                optimizer.step()

            epoch_loss += loss.item()

        avg_loss = epoch_loss / len(dataloader)
        metrics["loss_history"].append(avg_loss)
        print(f"Epoch {epoch}: Loss {avg_loss:.4f}")

    return metrics
