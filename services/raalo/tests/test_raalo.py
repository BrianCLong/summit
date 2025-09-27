import math
import sys
from pathlib import Path
from typing import Dict, List, Sequence, Tuple

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from services.raalo import (
    CertificateSigner,
    FairnessSlice,
    RAALO,
    SelectionConstraints,
    Sample,
)


class InMemoryDSRClient:
    def __init__(self, slices: Sequence[FairnessSlice]) -> None:
        self._slices: Dict[str, FairnessSlice] = {slice_.name: slice_ for slice_ in slices}

    def get_fairness_slices(self, slice_names: Sequence[str]) -> Dict[str, FairnessSlice]:
        return {name: self._slices[name] for name in slice_names if name in self._slices}


class RecordingHFAClient:
    def __init__(self) -> None:
        self.queued: List[List[str]] = []

    def queue_for_adjudication(self, samples: Sequence[Sample]) -> None:
        self.queued.append([sample.id for sample in samples])


@pytest.fixture
def fairness_slices() -> List[FairnessSlice]:
    return [
        FairnessSlice(name="neg", description="Negative feature space", min_coverage=2),
        FairnessSlice(name="pos", description="Positive feature space", min_coverage=2),
    ]


@pytest.fixture
def dataset() -> List[Sample]:
    xs = [-3.0, -2.0, -1.0, -0.6, -0.3, -0.1, 0.0, 0.2, 0.4, 0.8, 1.6, 2.4, 3.2]
    samples: List[Sample] = []
    for idx, x in enumerate(xs):
        probability = 1.0 / (1.0 + math.exp(-x / 1.5))
        uncertainty = 1.0 - abs(probability - 0.5) * 2
        jurisdiction = "US" if idx % 3 != 0 else "EU"
        if idx == len(xs) - 1:
            jurisdiction = "CN"
        samples.append(
            Sample(
                id=f"sample-{idx}",
                prediction=probability,
                uncertainty=uncertainty,
                features={"x": x},
                slice_memberships={"pos" if x >= 0 else "neg"},
                sensitivity=idx % 6 == 0,
                jurisdiction=jurisdiction,
                label=1 if x >= 0 else 0,
            )
        )
    return samples


@pytest.fixture
def constraints() -> SelectionConstraints:
    return SelectionConstraints(
        total_selection_size=6,
        slice_min_coverage={"neg": 2, "pos": 2},
        max_sensitive_fraction=0.4,
        allowed_jurisdictions={"US", "EU"},
        dp_epsilon_budget=0.6,
        epsilon_per_sample=0.1,
        slice_sensitivity_caps={"pos": 0.5},
    )


def build_orchestrator(fairness_slices: Sequence[FairnessSlice]) -> Tuple[RAALO, RecordingHFAClient]:
    dsr_client = InMemoryDSRClient(fairness_slices)
    hfa_client = RecordingHFAClient()
    signer = CertificateSigner("super-secret")
    orchestrator = RAALO(dsr_client=dsr_client, hfa_client=hfa_client, signer=signer)
    return orchestrator, hfa_client


def test_selection_reproducible(dataset: List[Sample], fairness_slices: List[FairnessSlice], constraints: SelectionConstraints) -> None:
    orchestrator_one, hfa_one = build_orchestrator(fairness_slices)
    orchestrator_two, _ = build_orchestrator(fairness_slices)

    result_one = orchestrator_one.select_samples(dataset, constraints, seed=99)
    result_two = orchestrator_two.select_samples(dataset, constraints, seed=99)

    assert result_one.certificate.selected_sample_ids == result_two.certificate.selected_sample_ids
    assert hfa_one.queued[0] == result_one.certificate.selected_sample_ids


def test_constraints_enforced(dataset: List[Sample], fairness_slices: List[FairnessSlice], constraints: SelectionConstraints) -> None:
    orchestrator, hfa_client = build_orchestrator(fairness_slices)
    result = orchestrator.select_samples(dataset, constraints, seed=7)

    counts = {slice_name: 0 for slice_name in constraints.slice_min_coverage}
    slice_sensitive = {slice_name: 0 for slice_name in constraints.slice_min_coverage}
    for sample in result.samples:
        for slice_name in sample.slice_memberships:
            if slice_name in counts:
                counts[slice_name] += 1
                if sample.sensitivity:
                    slice_sensitive[slice_name] += 1
        assert sample.jurisdiction in constraints.allowed_jurisdictions

    for slice_name, min_required in constraints.slice_min_coverage.items():
        assert counts[slice_name] >= min_required
        cap = constraints.slice_sensitivity_caps.get(slice_name)
        if cap is not None and counts[slice_name]:
            assert slice_sensitive[slice_name] / counts[slice_name] <= cap + 1e-9

    sensitive_total = sum(1 for sample in result.samples if sample.sensitivity)
    assert sensitive_total / len(result.samples) <= constraints.max_sensitive_fraction + 1e-9
    assert pytest.approx(result.certificate.epsilon_spent, rel=1e-6) == constraints.dp_epsilon_budget
    assert hfa_client.queued[0] == result.certificate.selected_sample_ids


def train_logistic(data: Sequence[Sample]) -> Sequence[float]:
    points = [(sample.features["x"], sample.label or 0) for sample in data]
    w, b = 0.0, 0.0
    learning_rate = 0.15
    for _ in range(400):
        grad_w = 0.0
        grad_b = 0.0
        for x, y in points:
            pred = 1.0 / (1.0 + math.exp(-(w * x + b)))
            grad_w += (pred - y) * x
            grad_b += pred - y
        if points:
            scale = 1.0 / len(points)
            w -= learning_rate * grad_w * scale
            b -= learning_rate * grad_b * scale
    return w, b


def evaluate_accuracy(model: Sequence[float], evaluation: Sequence[Sample]) -> float:
    w, b = model
    correct = 0
    for sample in evaluation:
        pred = 1.0 / (1.0 + math.exp(-(w * sample.features["x"] + b)))
        label = 1 if pred >= 0.5 else 0
        if label == (sample.label or 0):
            correct += 1
    return correct / len(evaluation)


def test_utility_improves_with_raalo_selected_samples(
    dataset: List[Sample], fairness_slices: List[FairnessSlice], constraints: SelectionConstraints
) -> None:
    initial_training = [dataset[0], dataset[5], dataset[8], dataset[10]]
    baseline_model = train_logistic(initial_training)
    baseline_accuracy = evaluate_accuracy(baseline_model, dataset)

    orchestrator, _ = build_orchestrator(fairness_slices)
    result = orchestrator.select_samples(dataset, constraints, seed=13)

    augmented_training = initial_training + result.samples
    updated_model = train_logistic(augmented_training)
    updated_accuracy = evaluate_accuracy(updated_model, dataset)

    assert updated_accuracy >= baseline_accuracy
    assert updated_accuracy - baseline_accuracy >= 0.05
    assert result.certificate.expected_utility_gain > 0
