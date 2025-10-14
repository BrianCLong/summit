from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from segf import (
    DriftScenario,
    PopulationConfig,
    SegfConfig,
    SegfValidator,
    SyntheticEntityGraphForge,
    TargetStats,
)


def test_seed_reproducibility():
    config = SegfConfig(
        population=PopulationConfig(n_users=200, n_merchants=30),
        drift_scenarios=[DriftScenario(name="spike", start_day=5, end_day=10)],
        random_seed=42,
    )

    forge_a = SyntheticEntityGraphForge(config, seed=config.random_seed)
    forge_b = SyntheticEntityGraphForge(config, seed=config.random_seed)

    result_a = forge_a.generate()
    result_b = forge_b.generate()

    assert result_a.users.equals(result_b.users)
    assert result_a.events.equals(result_b.events)


def test_validator_matches_targets():
    config = SegfConfig(
        population=PopulationConfig(n_users=150, n_merchants=25, fraud_user_ratio=0.1),
        drift_scenarios=[
            DriftScenario(name="holiday", start_day=10, end_day=15, fraud_multiplier=1.4, chargeback_multiplier=1.6)
        ],
        random_seed=99,
    )
    forge = SyntheticEntityGraphForge(config)
    result = forge.generate()

    txn_events = result.events[result.events.event_type == "transaction"]
    chargebacks = result.events[result.events.event_type == "chargeback"]
    chargeback_rate = len(chargebacks) / len(txn_events) if len(txn_events) else 0.0
    horizon = result.lifecycles.end_day.max() - result.lifecycles.start_day.min() + 1
    daily_txn = len(txn_events) / horizon

    scenario_events = result.events[result.events.drift_tag == "holiday"]
    scenario_txns = scenario_events[scenario_events.event_type == "transaction"]
    scenario_cbs = scenario_events[scenario_events.event_type == "chargeback"]
    scenario_cb_rate = (
        len(scenario_cbs) / len(scenario_txns) if len(scenario_txns) and chargeback_rate else chargeback_rate
    )

    validator = SegfValidator(
        TargetStats(
            expected_user_fraud_ratio=result.users.is_fraud.mean(),
            expected_chargeback_rate=chargeback_rate,
            expected_daily_transactions=daily_txn,
            drift_windows={
                "holiday": {
                    "chargeback_multiplier": (scenario_cb_rate / chargeback_rate) if chargeback_rate else 1.0
                }
            },
            tolerance=0.05,
        )
    )

    report = validator.evaluate(users=result.users, events=result.events, lifecycles=result.lifecycles)
    assert report.within_tolerance
    assert "holiday" in report.drift_metrics
