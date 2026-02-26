import torch
import torch.nn as nn
from summit.evaluation.sharpness import SharpnessEvaluator


def test_sharpness_calculation():
    """Verify that SharpnessEvaluator runs without error."""
    model = nn.Linear(5, 1)
    evaluator = SharpnessEvaluator(rho=0.1)

    input_data = torch.randn(4, 5)
    target = torch.randn(4, 1)
    dataset = [(input_data, target)]
    criterion = nn.MSELoss()

    report = evaluator.compute_sharpness(model, dataset, criterion)

    assert "baseline_loss" in report
    assert "perturbed_loss" in report
    assert "sharpness" in report
    assert "rho" in report

    # Since it's a simple linear model, we expect some sharpness value
    assert report["rho"] == 0.1
