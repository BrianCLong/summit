from pathlib import Path

import pytest
from esa.evaluation import population_stats
from esa.sampling import SamplingPlan
from esa.utils import group_by, load_dataset


def test_uniform_sampling_deterministic(dataset_file: Path) -> None:
    plan_config = {"type": "uniform", "sample_size": 4, "seed": 99}
    records = load_dataset(dataset_file)
    plan = SamplingPlan.from_config(plan_config)
    first = plan.execute(records)
    second = SamplingPlan.from_config(plan_config).execute(records)
    assert [item.record.index for item in first.sampled] == [
        item.record.index for item in second.sampled
    ]


@pytest.mark.parametrize(
    "plan_config",
    [
        {"type": "uniform", "sample_size": 5, "seed": 7},
        {"type": "reservoir", "sample_size": 5, "seed": 7},
    ],
)
def test_unbiased_uniform_family(plan_config, dataset_file: Path) -> None:
    from esa.cli import evaluate_plan

    records = load_dataset(dataset_file)
    evaluation = evaluate_plan(plan_config, dataset_file, "value")
    pop = population_stats(records, "value")
    sample_size = evaluation.sample["count"]
    f = sample_size / pop["count"]
    expected_variance = (1 - f) * pop["variance"] / sample_size
    assert pytest.approx(evaluation.expected_bias, abs=1e-9) == 0.0
    assert pytest.approx(evaluation.expected_variance, rel=1e-9) == expected_variance


def test_stratified_plan_diagnostics(dataset_file: Path) -> None:
    from esa.cli import evaluate_plan

    plan_config = {
        "type": "stratified",
        "seed": 21,
        "sample_size": 6,
        "strata": ["group"],
    }
    records = load_dataset(dataset_file)
    plan = SamplingPlan.from_config(plan_config)
    result = plan.execute(records)
    evaluation = evaluate_plan(plan_config, dataset_file, "value")
    groups = group_by(records, ["group"])
    pop_count = len(records)
    theoretical = 0.0
    for key, members in groups.items():
        Nh = len(members)
        Wh = Nh / pop_count
        Sh2 = population_stats(members, "value")["variance"]
        nh = result.metadata["strata"][key]["sample"]  # type: ignore[index]
        if nh <= 1:
            continue
        theoretical += (Wh**2) * ((1 - nh / Nh) * Sh2 / nh)
    assert pytest.approx(evaluation.expected_variance, rel=1e-9) == theoretical


def test_pps_plan_variance(dataset_file: Path) -> None:
    from esa.cli import evaluate_plan

    plan_config = {
        "type": "pps",
        "seed": 3,
        "sample_size": 8,
        "weight_column": "weight",
    }
    evaluation = evaluate_plan(plan_config, dataset_file, "value")
    assert pytest.approx(evaluation.expected_bias, abs=1e-9) == 0.0
    assert evaluation.expected_variance >= 0
