from __future__ import annotations

import contextlib
import io
import random
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

from cognitive_nlp_engine.dialogue.manager import DialogueManager
from cognitive_nlp_engine.nlu.query_parser import SecurityQueryParser
from intelgraph.cognitive_bias_detector import BiasType
from intelgraph.cognitive_bias_mitigation_integration import CognitiveBiasMitigationSystem
from intelgraph.cognitive_modeling import AdvancedCognitiveOS, BehavioralPattern, CognitiveDomain


@dataclass
class BiasScenario:
    """Configuration for a bias scenario simulation."""

    name: str
    prompt: str
    decision_context: Dict[str, Any]
    target_bias: BiasType
    expected_strategies: List[str]


@dataclass
class ScenarioEvaluationResult:
    """Result of evaluating a single bias scenario."""

    scenario_name: str
    target_bias: BiasType
    detected: bool
    detection_confidence: float
    severity: Optional[str]
    neutralized: bool
    applied_strategies: List[str]
    bias_reduction: float
    recommendations: List[str]
    mitigation_recommendations: List[str]
    raw_analysis: Dict[str, Any]


@dataclass
class EvaluationSummary:
    """Aggregate view of the bias mitigation evaluation."""

    scenario_results: List[ScenarioEvaluationResult]
    overall_detection_rate: float
    average_bias_reduction: float
    neutralization_success_rate: float

    def to_dict(self) -> Dict[str, Any]:
        """Return a JSON-serializable representation of the summary."""
        return {
            "overall_detection_rate": self.overall_detection_rate,
            "average_bias_reduction": self.average_bias_reduction,
            "neutralization_success_rate": self.neutralization_success_rate,
            "scenario_results": [
                {
                    "scenario_name": result.scenario_name,
                    "target_bias": result.target_bias.value,
                    "detected": result.detected,
                    "detection_confidence": result.detection_confidence,
                    "severity": result.severity,
                    "neutralized": result.neutralized,
                    "applied_strategies": result.applied_strategies,
                    "bias_reduction": result.bias_reduction,
                    "recommendations": result.recommendations,
                    "mitigation_recommendations": result.mitigation_recommendations,
                    "raw_analysis": result.raw_analysis,
                }
                for result in self.scenario_results
            ],
        }


class CognitiveBiasMitigationEvaluator:
    """Simulate bias scenarios and evaluate mitigation effectiveness."""

    def __init__(self, verbose: bool = False) -> None:
        self.verbose = verbose
        random.seed(42)
        self.parser = SecurityQueryParser()
        self.dialogue_manager = DialogueManager()

        self.cognitive_os = AdvancedCognitiveOS()
        agent_configs = [
            {
                "name": "BiasEvaluationAgent",
                "domain": CognitiveDomain.INDIVIDUAL,
                "patterns": [BehavioralPattern.PROACTIVE, BehavioralPattern.ADAPTIVE],
            }
        ]

        if verbose:
            agent_ids = self.cognitive_os.initialize_cognitive_agents(agent_configs)
        else:
            with contextlib.redirect_stdout(io.StringIO()):
                agent_ids = self.cognitive_os.initialize_cognitive_agents(agent_configs)

        self.agent_id = agent_ids[0]

        self.bias_system = CognitiveBiasMitigationSystem()
        self.cognitive_os = self.bias_system.integrate_with_cognitive_os(self.cognitive_os)
        self.agent = self.cognitive_os.cognitive_agents[self.agent_id]

        self.scenarios = self._build_scenarios()

    def _build_scenarios(self) -> List[BiasScenario]:
        """Define the targeted cognitive bias scenarios."""
        anchoring_context = {
            "scenario": "Budget forecasting anchored to initial vendor quote",
            "options": [
                "Accept initial quote",
                "Negotiate adjustments",
                "Re-open competitive bidding",
            ],
            "time_pressure": 0.65,
            "information_completeness": 0.55,
            "cognitive_load": 0.7,
            "emotional_state": {
                "dominant_emotion": "concern",
                "intensity": 0.35,
                "influence_on_decision": 0.45,
            },
            "initial_estimate": 120.0,
            "final_estimate": 126.0,
            "adjustment_process": {
                "amount": 6.0,
                "direction": "upward",
                "reviewed_alternatives": False,
            },
            "expected_outcomes": {"positive_outlook": 0.62, "negative_outlook": 0.38},
            "alternatives": ["negotiate", "defer decision", "seek competitor bid"],
        }

        confirmation_context = {
            "scenario": "Investigation where analyst prefers existing hypothesis",
            "options": [
                "Validate initial hypothesis",
                "Collect neutral evidence",
                "Escalate for external review",
            ],
            "time_pressure": 0.5,
            "information_completeness": 0.48,
            "cognitive_load": 0.68,
            "emotional_state": {
                "dominant_emotion": "confidence",
                "intensity": 0.5,
                "influence_on_decision": 0.4,
            },
            "current_belief": True,
            "evidence": [
                {"supports": True, "source_reliability": 0.9},
                {"supports": True, "source_reliability": 0.88},
                {"supports": True, "source_reliability": 0.85},
                {"supports": True, "source_reliability": 0.82},
                {"supports": True, "source_reliability": 0.8},
                {"supports": False, "source_reliability": 0.95},
            ],
            "information_gathering": {"confirming_search": 0.82, "disconfirming_search": 0.18},
            "analysis_focus": "supporting_data",
            "alternatives": ["expand dataset", "pause investigation", "peer review"],
        }

        framing_context = {
            "scenario": "Risk communication framed around potential losses",
            "options": [
                "Adopt aggressive patching",
                "Maintain current cadence",
                "Delay for broader testing",
            ],
            "time_pressure": 0.55,
            "information_completeness": 0.6,
            "cognitive_load": 0.58,
            "emotional_state": {
                "dominant_emotion": "urgency",
                "intensity": 0.52,
                "influence_on_decision": 0.5,
            },
            "decision_frame": {
                "presentation": "loss_avoidance_vs_gain",
                "emphasis": "avoidance_of_losses",
                "presentation_bias": 0.85,
                "contrast": {
                    "gain_frame_choice": "maintain",
                    "loss_frame_choice": "accelerate",
                },
            },
            "alternatives": ["accelerate patching", "maintain schedule", "accept risk temporarily"],
        }

        return [
            BiasScenario(
                name="Anchoring Bias",
                prompt=(
                    "Evaluate the contract renewal scenario where decision makers keep returning "
                    "to the vendor's initial $120K quote despite new benchmarks."
                ),
                decision_context=anchoring_context,
                target_bias=BiasType.ANCHORING_BIAS,
                expected_strategies=["anchor_and_adjust", "use_base_rate_statistics"],
            ),
            BiasScenario(
                name="Confirmation Bias",
                prompt=(
                    "Analyze the insider threat investigation where the analyst is convinced the "
                    "primary suspect is guilty and keeps citing evidence that agrees."
                ),
                decision_context=confirmation_context,
                target_bias=BiasType.CONFIRMATION_BIAS,
                expected_strategies=["actively_seek_disconfirming_evidence", "red_teaming"],
            ),
            BiasScenario(
                name="Framing Effect",
                prompt=(
                    "Assess the security advisory where the same mitigation options are described as "
                    "either preventing losses or missing gains depending on the audience."
                ),
                decision_context=framing_context,
                target_bias=BiasType.FRAMING_EFFECT,
                expected_strategies=["red_teaming", "taking_the_outside_view"],
            ),
        ]

    def evaluate(self) -> List[ScenarioEvaluationResult]:
        """Run all scenarios and collect evaluation results."""
        results: List[ScenarioEvaluationResult] = []

        for scenario in self.scenarios:
            conversation_id = self.dialogue_manager.start_dialogue(
                user_id="bias_tester",
                initial_context={"scenario": scenario.name},
            )

            parsed_query = self.parser.parse_query(scenario.prompt)
            turn = self.dialogue_manager.process_turn(
                conversation_id,
                scenario.prompt,
                parsed_query.__dict__,
            )
            self.dialogue_manager.end_dialogue(conversation_id)

            decision_context = dict(scenario.decision_context)
            decision_context.update(
                {
                    "parsed_intent": parsed_query.intent,
                    "parsed_entities": parsed_query.entities,
                    "parser_confidence": parsed_query.confidence,
                    "dialogue_turn_id": turn.turn_id,
                }
            )

            analysis_result = self.bias_system.analyze_decision_context(self.agent, decision_context)
            sanitized_result = dict(analysis_result)
            timestamp_value = sanitized_result.get("timestamp")
            if isinstance(timestamp_value, datetime):
                sanitized_result["timestamp"] = timestamp_value.isoformat()

            result = self._summarize_scenario(scenario, sanitized_result)
            results.append(result)

        return results

    def _summarize_scenario(
        self, scenario: BiasScenario, analysis_result: Dict[str, Any]
    ) -> ScenarioEvaluationResult:
        """Create a condensed summary for an individual scenario."""
        bias_detections = analysis_result.get("bias_detections", [])
        matching_detection = next(
            (d for d in bias_detections if d.get("bias_type") == scenario.target_bias.value),
            None,
        )

        debiasing_results = analysis_result.get("debiasing_results", [])
        relevant_results = [
            entry
            for entry in debiasing_results
            if entry.get("strategy_applied") in scenario.expected_strategies
        ]

        applied_strategies = [entry["strategy_applied"] for entry in relevant_results]
        if relevant_results:
            bias_reduction = sum(entry["bias_reduction"] for entry in relevant_results) / len(
                relevant_results
            )
        else:
            bias_reduction = 0.0

        neutralized = bool(
            matching_detection
            and applied_strategies
            and bias_reduction >= 0.3
        )

        recommendations: List[str] = []
        if matching_detection and matching_detection.get("recommendation"):
            recommendations.append(matching_detection["recommendation"])

        mitigation_recommendations = analysis_result.get("mitigation_recommendations", [])
        recommendations.extend(mitigation_recommendations[:3])

        return ScenarioEvaluationResult(
            scenario_name=scenario.name,
            target_bias=scenario.target_bias,
            detected=matching_detection is not None,
            detection_confidence=(
                matching_detection["confidence_score"] if matching_detection else 0.0
            ),
            severity=(matching_detection.get("severity_level") if matching_detection else None),
            neutralized=neutralized,
            applied_strategies=applied_strategies,
            bias_reduction=bias_reduction,
            recommendations=recommendations,
            mitigation_recommendations=mitigation_recommendations[:5],
            raw_analysis=analysis_result,
        )


def run_bias_mitigation_evaluation(verbose: bool = False) -> EvaluationSummary:
    """Execute the bias mitigation evaluation workflow."""
    evaluator = CognitiveBiasMitigationEvaluator(verbose=verbose)
    scenario_results = evaluator.evaluate()

    total = len(scenario_results)
    detection_rate = sum(1 for result in scenario_results if result.detected) / total if total else 0.0
    average_bias_reduction = (
        sum(result.bias_reduction for result in scenario_results) / total if total else 0.0
    )
    neutralization_rate = (
        sum(1 for result in scenario_results if result.neutralized) / total if total else 0.0
    )

    return EvaluationSummary(
        scenario_results=scenario_results,
        overall_detection_rate=detection_rate,
        average_bias_reduction=average_bias_reduction,
        neutralization_success_rate=neutralization_rate,
    )


if __name__ == "__main__":  # pragma: no cover
    summary = run_bias_mitigation_evaluation(verbose=True)
    print("\nBias Mitigation Evaluation Summary")
    print("=" * 40)
    for result in summary.scenario_results:
        print(f"\nScenario: {result.scenario_name}")
        print(f"  Target Bias: {result.target_bias.value}")
        print(f"  Detected: {result.detected} (confidence={result.detection_confidence:.2f})")
        print(f"  Neutralized: {result.neutralized} (bias reduction={result.bias_reduction:.2f})")
        if result.applied_strategies:
            print(f"  Strategies: {', '.join(result.applied_strategies)}")
        for recommendation in result.recommendations[:3]:
            print(f"  Recommendation: {recommendation}")

    print("\nOverall detection rate:", f"{summary.overall_detection_rate:.2f}")
    print("Average bias reduction:", f"{summary.average_bias_reduction:.2f}")
    print("Neutralization success rate:", f"{summary.neutralization_success_rate:.2f}")
