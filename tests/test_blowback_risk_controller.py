import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parent.parent))

from blowback_risk_controller import (  # noqa: E402
    BlowbackPath,
    BlowbackRiskController,
    CoolingPlay,
    Indicator,
    IntegrityFriction,
    MeasurementPlan,
    MessengerProfile,
    Provocation,
    RiskScoreConfig,
    TimebandAction,
    ValidationError,
)


def test_to_dict_roundtrip() -> None:
    controller = BlowbackRiskController()
    controller.add_path(
        BlowbackPath(
            path="A",
            trigger="test",
            likelihood=5,
            impact=7,
            reversibility=4,
            tripwires=["x"],
            tuning_parameters={"likelihood": 0.5},
        )
    )
    controller.add_path(
        BlowbackPath(
            path="B",
            trigger="test2",
            likelihood=8,
            impact=5,
            reversibility=2,
        )
    )
    controller.add_provocation(
        Provocation(
            bait="leak",
            counter_moves=["delay"],
            confidence="High",
            tuning_rules={"if urgency >0.7": "delay"},
        )
    )
    controller.add_cooling_play(
        CoolingPlay(
            tier=1,
            audience="public",
            messenger="spokesperson",
            channel="web",
            timing="immediate",
            expected_effect="neutral",
            risks="ignored",
            tuning_sliders={"virality_reduction": 0.2},
        )
    )
    controller.add_friction(
        IntegrityFriction(
            name="Provenance",
            references=["EU DSA"],
            intensity_levels={"light": 0.2},
            audience_applications=["public"],
        )
    )
    controller.add_indicator(
        Indicator(
            name="Mention spike",
            green="<100%",
            amber="100-200%",
            red=">200%",
            play_trigger="monitor",
            customizable_params={"threshold": 150.0},
            fusion_logic="mentions*sentiment",
        )
    )
    controller.add_messenger(
        MessengerProfile(
            audience="public",
            messenger="journalist",
            cred_score=0.8,
            reach="high",
            notes="no myths",
            selection_algo="trust*reach",
            variants={"A": "video"},
        )
    )
    controller.add_timeband(
        TimebandAction(
            band="0-24h",
            actions=["document"],
            resources=["legal"],
            conditions=["provocation confirmed"],
            pivots=["if virality>threshold prep tier2"],
        )
    )
    controller.set_measurement_plan(
        MeasurementPlan(
            metrics=["rumor velocity"],
            dashboards=["sentiment"],
            cadence="daily",
            weights={"safety": 0.6},
            tuning_views=["audience"],
        )
    )
    controller.set_transparency_note("We will publish updates.")

    plan_dict = controller.to_dict()
    rebuilt = BlowbackRiskController.from_dict(plan_dict)
    assert rebuilt.to_dict() == plan_dict
    ranked = rebuilt.rank_paths()
    assert [p.path for p in ranked] == ["B", "A"]


def test_path_risk_score_custom_config() -> None:
    path = BlowbackPath(
        path="A",
        trigger="test",
        likelihood=5,
        impact=6,
        reversibility=4,
        tuning_parameters={"likelihood": 0.5},
        audience_segments=["public"],
    )

    default_score = path.risk_score()
    assert default_score == 5 * 6 * (10 - 4)

    config = RiskScoreConfig(
        likelihood_weight=1.2,
        impact_weight=0.8,
        reversibility_weight=1.1,
        tuning_parameter_weights={"likelihood": 0.5},
        audience_weights={"public": 1.3},
    )
    details = path.risk_details(config)
    assert details["likelihood_term"] == pytest.approx(6.0)
    assert details["impact_term"] == pytest.approx(4.8)
    assert details["reversibility_term"] == pytest.approx(6 * 1.1)
    assert details["base_score"] == pytest.approx(190.08)
    assert details["adjusted_score"] == pytest.approx(308.88)
    assert path.risk_score(config) == pytest.approx(308.88)


def test_invalid_path_inputs_raise() -> None:
    with pytest.raises(ValidationError):
        BlowbackPath(
            path="bad",
            trigger="t",
            likelihood=0,
            impact=5,
            reversibility=5,
        )

    with pytest.raises(ValidationError):
        BlowbackPath(
            path="bad",
            trigger="t",
            likelihood=5,
            impact=5,
            reversibility=5,
            tuning_parameters={"likelihood": 2.0},
        )


def test_controller_summary_and_validation() -> None:
    controller = BlowbackRiskController()
    controller.add_path(
        BlowbackPath(
            path="A",
            trigger="test",
            likelihood=6,
            impact=7,
            reversibility=3,
            tripwires=["rumor spike"],
            tuning_parameters={"likelihood": 0.4},
            audience_segments=["general", "allies"],
        )
    )
    controller.add_path(
        BlowbackPath(
            path="B",
            trigger="test2",
            likelihood=4,
            impact=4,
            reversibility=8,
            tripwires=["tone backlash"],
            audience_segments=["allies"],
        )
    )
    controller.add_messenger(
        MessengerProfile(
            audience="general",
            messenger="trusted",
            cred_score=0.7,
            reach="medium",
            notes="",
            selection_algo="trust*reach",
        )
    )

    config = RiskScoreConfig(audience_weights={"allies": 1.2})
    summary = controller.aggregate_risk(config)
    assert summary["total_paths"] == 2
    assert summary["highest_risk_path"]["path"] == "A"
    assert summary["average_score"] > 0
    assert summary["audience_totals"]["allies"] > summary["audience_totals"]["general"]

    alerts = controller.high_risk_tripwires(threshold=50, config=config)
    assert alerts["A"] == ["rumor spike"]
    assert "B" not in alerts

    controller.validate(config)

    controller.add_messenger(
        MessengerProfile(
            audience="general",
            messenger="invalid",
            cred_score=1.5,
            reach="low",
            notes="",
            selection_algo="trust",
        )
    )
    with pytest.raises(ValidationError):
        controller.validate(config)
