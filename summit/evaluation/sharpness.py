# summit/evaluation/sharpness.py
# Summit original clean-room implementation

import torch
import torch.nn as nn
import json
from pathlib import Path
from typing import Dict, Any, Optional

class SharpnessEvaluator:
    def __init__(self, rho: float = 0.05, adaptive: bool = False):
        self.rho = rho
        self.adaptive = adaptive

    def compute_sharpness(
        self,
        model: nn.Module,
        dataloader: Any,
        criterion: nn.Module,
        device: str = "cpu"
    ) -> Dict[str, Any]:
        """
        Computes the sharpness of the loss landscape at the current parameters.
        Sharpness is defined as the maximum loss in a rho-neighborhood.
        """
        model.to(device)

        # 1. Compute baseline loss
        model.eval()
        baseline_loss = 0.0
        num_batches = 0
        with torch.no_grad():
            for data, target in dataloader:
                data, target = data.to(device), target.to(device)
                output = model(data)
                loss = criterion(output, target)
                baseline_loss += loss.item()
                num_batches += 1
        baseline_loss /= num_batches

        # 2. Find the worst-case perturbation (approximate with one gradient step)
        # Enable grad for perturbation computation
        model.train()

        # Compute gradient for perturbation
        # Use first batch for gradient direction
        data, target = next(iter(dataloader))
        data, target = data.to(device), target.to(device)
        model.zero_grad()
        output = model(data)
        loss = criterion(output, target)
        loss.backward()

        # Compute grad norm
        with torch.no_grad():
            grad_norm = torch.norm(
                torch.stack([
                    ((torch.abs(p) if self.adaptive else 1.0) * p.grad).norm(p=2).to(device)
                    for p in model.parameters()
                    if p.grad is not None
                ]),
                p=2
            )

            # Compute and apply perturbation
            scale = self.rho / (grad_norm + 1e-12)
            old_params = {}
            for name, p in model.named_parameters():
                if p.grad is not None:
                    old_params[name] = p.data.clone()
                    e_w = (torch.pow(p, 2) if self.adaptive else 1.0) * p.grad * scale
                    p.data.add_(e_w)

        # 3. Compute loss at perturbed parameters
        model.eval()
        perturbed_loss = 0.0
        with torch.no_grad():
            for data, target in dataloader:
                data, target = data.to(device), target.to(device)
                output = model(data)
                loss = criterion(output, target)
                perturbed_loss += loss.item()
        perturbed_loss /= num_batches

        # 4. Restore parameters
        with torch.no_grad():
            for name, p in model.named_parameters():
                if name in old_params:
                    p.data.copy_(old_params[name])

        sharpness = perturbed_loss - baseline_loss

        report = {
            "baseline_loss": baseline_loss,
            "perturbed_loss": perturbed_loss,
            "sharpness": sharpness,
            "rho": self.rho,
            "adaptive": self.adaptive
        }

        return report

    def save_report(self, report: Dict[str, Any], filepath: str = "sharpness_report.json"):
        with open(filepath, "w") as f:
            json.dump(report, f, indent=4)
