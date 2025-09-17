import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from blowback_risk_controller import (
    BlowbackRiskController,
    BlowbackPath,
    Provocation,
    CoolingPlay,
    IntegrityFriction,
    Indicator,
    MessengerProfile,
    TimebandAction,
    MeasurementPlan,
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
    assert plan_dict["blowback_map"][0]["path"] == "A"
    assert plan_dict["provocations"][0]["bait"] == "leak"
    assert plan_dict["measurement_plan"]["metrics"] == ["rumor velocity"]
