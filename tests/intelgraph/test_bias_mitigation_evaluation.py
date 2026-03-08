from __future__ import annotations

import pathlib
import sys

import pytest

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from cognitive_nlp_engine.bias_mitigation_evaluation import run_bias_mitigation_evaluation
from intelgraph.cognitive_bias_detector import BiasType


def test_bias_mitigation_evaluation_targets_core_biases() -> None:
    summary = run_bias_mitigation_evaluation(verbose=False)

    assert len(summary.scenario_results) == 3
    assert summary.overall_detection_rate == pytest.approx(1.0)
    assert summary.neutralization_success_rate == pytest.approx(1.0)
    assert summary.average_bias_reduction > 0.3

    observed_biases = {result.target_bias for result in summary.scenario_results}
    expected_biases = {
        BiasType.ANCHORING_BIAS,
        BiasType.CONFIRMATION_BIAS,
        BiasType.FRAMING_EFFECT,
    }
    assert expected_biases.issubset(observed_biases)

    expected_strategies = {
        BiasType.ANCHORING_BIAS: {"anchor_and_adjust", "use_base_rate_statistics"},
        BiasType.CONFIRMATION_BIAS: {"actively_seek_disconfirming_evidence", "red_teaming"},
        BiasType.FRAMING_EFFECT: {"red_teaming", "taking_the_outside_view"},
    }

    for result in summary.scenario_results:
        assert result.detected
        assert result.neutralized
        assert result.detection_confidence >= 0.6
        assert result.bias_reduction >= 0.3
        assert result.applied_strategies
        assert expected_strategies[result.target_bias].intersection(result.applied_strategies)
        assert result.raw_analysis["bias_detections"]
        assert result.raw_analysis["debiasing_results"]
        assert result.raw_analysis["mitigation_recommendations"]
        assert result.recommendations
        assert result.mitigation_recommendations

    serialized = summary.to_dict()
    assert serialized["scenario_results"]
    for entry in serialized["scenario_results"]:
        assert entry["detected"] is True
        assert entry["neutralized"] is True
        assert isinstance(entry["raw_analysis"]["timestamp"], str)
