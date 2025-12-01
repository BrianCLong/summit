from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
import pandas.testing as pdt
import pytest

import sys
sys.path.append(str(Path(__file__).resolve().parents[1] / "src"))

from resb import RESBConfig, RESBGenerator, RangeConstraint


@pytest.fixture(scope="module")
def rare_event_frame() -> pd.DataFrame:
    rng = np.random.default_rng(123)
    majority = 200
    minority = 20
    return pd.DataFrame(
        {
            "age": np.concatenate(
                [rng.normal(45, 6, size=majority), rng.normal(60, 4, size=minority)]
            ),
            "spend": np.concatenate(
                [rng.normal(2000, 500, size=majority), rng.normal(3500, 400, size=minority)]
            ),
            "region": np.concatenate(
                [
                    rng.choice(["north", "south"], size=majority, p=[0.6, 0.4]),
                    rng.choice(["north", "south"], size=minority, p=[0.2, 0.8]),
                ]
            ),
            "label": [0] * majority + [1] * minority,
        }
    )


@pytest.fixture(scope="module")
def generator_config() -> RESBConfig:
    return RESBConfig(
        target_column="label",
        boost_multiplier=3.0,
        epsilon=20.0,
        delta=1e-6,
        precision_target=0.6,
        constraints=[
            RangeConstraint("age", 18, 90),
            RangeConstraint("spend", 0, 5000),
        ],
        seed=99,
    )


def test_resb_pipeline_is_deterministic_and_boosts_recall(
    rare_event_frame: pd.DataFrame, generator_config: RESBConfig
) -> None:
    generator = RESBGenerator(generator_config)
    result_one = generator.boost(rare_event_frame)
    result_two = RESBGenerator(generator_config).boost(rare_event_frame)

    pdt.assert_frame_equal(result_one.synthetic, result_two.synthetic)
    assert (result_one.synthetic["age"] >= 18).all()
    assert (result_one.synthetic["age"] <= 90).all()
    assert (result_one.synthetic["spend"] >= 0).all()
    assert (result_one.synthetic["spend"] <= 5000).all()

    utility = result_one.reports.utility
    assert utility.recall_gain > 0
    assert utility.meets_precision_target is True
    assert utility.precision >= generator_config.precision_target

    dp_report = result_one.reports.dp
    assert "label" not in dp_report.sigma
    assert all(value > 0 for value in dp_report.sigma.values())

    auditor = result_one.auditor
    assert auditor.duplicate_count == 0
    assert auditor.closest_distance > 0

    # Ensure generated labels remain class-conditional on the minority class
    assert set(result_one.synthetic["label"].unique()) == {1}
