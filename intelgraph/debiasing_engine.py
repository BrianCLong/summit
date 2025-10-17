"""
Debiasing Engine for IntelGraph

This module implements strategies and mechanisms to reduce cognitive biases
in cognitive agents' decision-making processes.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Callable, Any, Optional
from enum import Enum
import statistics
import uuid


class DebiasingStrategy(Enum):
    """Types of debiasing strategies available."""
    ACTIVELY_SEEK_DISCONFIRMING_EVIDENCE = "actively_seek_disconfirming_evidence"
    USE_BASE_RATE_STATISTICS = "use_base_rate_statistics"
    ANCHOR_AND_ADJUST = "anchor_and_adjust"
    PRE_MORTEM_ANALYSIS = "pre_mortem_analysis"
    CONSIDER_OPPORTUNITY_COST = "consider_opportunity_cost"
    RED_TEAMING = "red_teaming"
    REFERENCE_CLASS_FORECASTING = "reference_class_forecasting"
    TAKING_THE_OUTSIDE_VIEW = "taking_the_outside_view"
    PROBABILITY_TRACKING = "probability_tracking"
    INCENTIVE_ALIGNMENT = "incentive_alignment"


@dataclass
class DebiasingResult:
    """Result of applying a debiasing strategy."""
    result_id: str
    strategy_applied: DebiasingStrategy
    effectiveness_score: float  # 0.0 to 1.0
    bias_reduction: float  # How much bias was reduced (0.0 to 1.0)
    new_decision_context: Dict[str, Any]  # Updated decision context after debiasing
    recommendations: List[str]  # Additional recommendations
    timestamp: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        if not self.result_id:
            self.result_id = f"result_{uuid.uuid4().hex[:12]}"


class DebiasingEngine:
    """
    Core class for applying debiasing strategies to mitigate cognitive biases.
    """
    
    def __init__(self):
        self.debiasing_strategies = {}  # Mapping of bias types to strategies
        self.effectiveness_metrics = {}  # Metrics for strategy effectiveness
        self.debiasing_history = []  # History of applied debiasing
        self._register_default_strategies()
    
    def _register_default_strategies(self):
        """Register default debiasing strategies."""
        self.register_debiasing_strategy(DebiasingStrategy.ACTIVELY_SEEK_DISCONFIRMING_EVIDENCE, 
                                        self._apply_actively_seek_disconfirming_evidence)
        self.register_debiasing_strategy(DebiasingStrategy.USE_BASE_RATE_STATISTICS, 
                                        self._apply_use_base_rate_statistics)
        self.register_debiasing_strategy(DebiasingStrategy.ANCHOR_AND_ADJUST, 
                                        self._apply_anchor_and_adjust)
        self.register_debiasing_strategy(DebiasingStrategy.PRE_MORTEM_ANALYSIS, 
                                        self._apply_pre_mortem_analysis)
        self.register_debiasing_strategy(DebiasingStrategy.CONSIDER_OPPORTUNITY_COST, 
                                        self._apply_consider_opportunity_cost)
        self.register_debiasing_strategy(DebiasingStrategy.RED_TEAMING, 
                                        self._apply_red_teaming)
        self.register_debiasing_strategy(DebiasingStrategy.REFERENCE_CLASS_FORECASTING, 
                                        self._apply_reference_class_forecasting)
        self.register_debiasing_strategy(DebiasingStrategy.TAKING_THE_OUTSIDE_VIEW, 
                                        self._apply_taking_the_outside_view)
        self.register_debiasing_strategy(DebiasingStrategy.PROBABILITY_TRACKING, 
                                        self._apply_probability_tracking)
        self.register_debiasing_strategy(DebiasingStrategy.INCENTIVE_ALIGNMENT, 
                                        self._apply_incentive_alignment)
    
    def register_debiasing_strategy(self, strategy: DebiasingStrategy, strategy_func: Callable):
        """Register a new debiasing strategy."""
        self.debiasing_strategies[strategy] = strategy_func
    
    def apply_debiasing(self, bias_detection_result, decision_context: Dict) -> List[DebiasingResult]:
        """Apply appropriate debiasing strategy based on detected bias."""
        results = []
        
        # Determine the most appropriate strategies for the detected bias
        strategies_to_apply = self._get_strategies_for_bias(bias_detection_result)
        
        for strategy in strategies_to_apply:
            if strategy in self.debiasing_strategies:
                result = self.debiasing_strategies[strategy](decision_context, bias_detection_result)
                if result:
                    results.append(result)
                    self.debiasing_history.append(result)
                    
                    # Keep only the last 500 results for memory efficiency
                    if len(self.debiasing_history) > 500:
                        self.debiasing_history = self.debiasing_history[-500:]
        
        return results
    
    def _get_strategies_for_bias(self, bias_detection_result) -> List[DebiasingStrategy]:
        """Determine which strategies are most appropriate for a specific bias."""
        bias_type = bias_detection_result.bias_type
        
        # Map bias types to appropriate strategies
        bias_strategy_map = {
            'confirmation_bias': [
                DebiasingStrategy.ACTIVELY_SEEK_DISCONFIRMING_EVIDENCE,
                DebiasingStrategy.RED_TEAMING
            ],
            'availability_heuristic': [
                DebiasingStrategy.USE_BASE_RATE_STATISTICS,
                DebiasingStrategy.TAKING_THE_OUTSIDE_VIEW
            ],
            'anchoring_bias': [
                DebiasingStrategy.ANCHOR_AND_ADJUST,
                DebiasingStrategy.USE_BASE_RATE_STATISTICS
            ],
            'hindsight_bias': [
                DebiasingStrategy.PROBABILITY_TRACKING,
                DebiasingStrategy.INCENTIVE_ALIGNMENT
            ],
            'optimism_bias': [
                DebiasingStrategy.REFERENCE_CLASS_FORECASTING,
                DebiasingStrategy.PRE_MORTEM_ANALYSIS
            ],
            'loss_aversion': [
                DebiasingStrategy.CONSIDER_OPPORTUNITY_COST,
                DebiasingStrategy.TAKING_THE_OUTSIDE_VIEW
            ],
            'status_quo_bias': [
                DebiasingStrategy.RED_TEAMING,
                DebiasingStrategy.CONSIDER_OPPORTUNITY_COST
            ],
            'overconfidence_effect': [
                DebiasingStrategy.PROBABILITY_TRACKING,
                DebiasingStrategy.RED_TEAMING
            ],
            'sunk_cost_fallacy': [
                DebiasingStrategy.CONSIDER_OPPORTUNITY_COST,
                DebiasingStrategy.INCENTIVE_ALIGNMENT
            ],
            'framing_effect': [
                DebiasingStrategy.RED_TEAMING,
                DebiasingStrategy.TAKING_THE_OUTSIDE_VIEW
            ]
        }
        
        bias_name = bias_detection_result.bias_type.value
        return bias_strategy_map.get(bias_name, [])
    
    def _apply_actively_seek_disconfirming_evidence(self, decision_context: Dict, 
                                                   bias_detection_result) -> Optional[DebiasingResult]:
        """Apply strategy to actively seek disconfirming evidence."""
        # Modify the decision context to include disconfirming evidence search
        updated_context = decision_context.copy()
        
        # Add a prompt to look for evidence that contradicts current beliefs
        if 'evidence_search' not in updated_context:
            updated_context['evidence_search'] = {
                'confirming_search': 0.5,
                'disconfirming_search': 0.5
            }
        else:
            updated_context['evidence_search']['disconfirming_search'] = 0.7  # Increase focus on disconfirming evidence
        
        # Calculate effectiveness based on the severity of the detected bias
        effectiveness = 0.5 + (bias_detection_result.confidence_score * 0.5)
        
        # Bias reduction is proportional to the strategy application
        bias_reduction = effectiveness * 0.6  # Estimate 60% potential reduction
        
        return DebiasingResult(
            result_id=f"result_{uuid.uuid4().hex[:12]}",
            strategy_applied=DebiasingStrategy.ACTIVELY_SEEK_DISCONFIRMING_EVIDENCE,
            effectiveness_score=effectiveness,
            bias_reduction=bias_reduction,
            new_decision_context=updated_context,
            recommendations=[
                "Systematically search for evidence that contradicts your current hypothesis",
                "Consult sources with different perspectives or viewpoints",
                "Ask critical questions about your assumptions and reasoning"
            ],
            timestamp=datetime.now(),
            metadata={
                "original_severity": bias_detection_result.severity_level,
                "target_severity": "medium" if effectiveness > 0.5 else "low"
            }
        )
    
    def _apply_use_base_rate_statistics(self, decision_context: Dict, 
                                       bias_detection_result) -> Optional[DebiasingResult]:
        """Apply strategy to use base rate statistics."""
        updated_context = decision_context.copy()
        
        # Emphasize the use of base rate statistics in the decision process
        if 'statistical_analysis' not in updated_context:
            updated_context['statistical_analysis'] = {
                'base_rate_consideration': 0.7,
                'individual_circumstances': 0.3
            }
        else:
            updated_context['statistical_analysis']['base_rate_consideration'] = 0.8
        
        # Calculate effectiveness based on bias type and severity
        effectiveness = 0.4 + (bias_detection_result.confidence_score * 0.4)
        bias_reduction = effectiveness * 0.7  # Estimate 70% potential reduction
        
        return DebiasingResult(
            result_id=f"result_{uuid.uuid4().hex[:12]}",
            strategy_applied=DebiasingStrategy.USE_BASE_RATE_STATISTICS,
            effectiveness_score=effectiveness,
            bias_reduction=bias_reduction,
            new_decision_context=updated_context,
            recommendations=[
                "Consider the base rate or prior probability of the outcome",
                "Use statistical data rather than memorable examples",
                "Apply Bayesian reasoning to update your beliefs"
            ],
            timestamp=datetime.now(),
            metadata={
                "base_rate_applications": ["historical_data", "statistical_benchmarks", "industry_standards"],
                "original_severity": bias_detection_result.severity_level
            }
        )
    
    def _apply_anchor_and_adjust(self, decision_context: Dict, 
                                bias_detection_result) -> Optional[DebiasingResult]:
        """Apply strategy to make more substantial adjustments from anchors."""
        updated_context = decision_context.copy()
        
        # Modify adjustment process to encourage more substantial changes
        if 'adjustment_process' not in updated_context:
            updated_context['adjustment_process'] = {
                'minimal_adjustment': False,
                'adjustment_multiplier': 2.0,  # Double the adjustment
                'alternative_anchor_consideration': True
            }
        else:
            updated_context['adjustment_process']['adjustment_multiplier'] = 1.8
        
        effectiveness = 0.5 + (bias_detection_result.confidence_score * 0.4)
        bias_reduction = effectiveness * 0.55  # Estimate 55% potential reduction
        
        return DebiasingResult(
            result_id=f"result_{uuid.uuid4().hex[:12]}",
            strategy_applied=DebiasingStrategy.ANCHOR_AND_ADJUST,
            effectiveness_score=effectiveness,
            bias_reduction=bias_reduction,
            new_decision_context=updated_context,
            recommendations=[
                "Deliberately consider alternative anchor points",
                "Make more substantial adjustments from initial estimates",
                "Question whether your initial anchor was appropriate"
            ],
            timestamp=datetime.now(),
            metadata={
                "adjustment_guidance": {
                    "multiplier_applied": 1.8,
                    "alternative_anchors_considered": True
                },
                "original_severity": bias_detection_result.severity_level
            }
        )
    
    def _apply_pre_mortem_analysis(self, decision_context: Dict, 
                                  bias_detection_result) -> Optional[DebiasingResult]:
        """Apply strategy of pre-mortem analysis."""
        updated_context = decision_context.copy()
        
        # Add pre-mortem analysis to the decision context
        updated_context['pre_mortem_analysis'] = {
            'failure_scenarios_considered': True,
            'probability_assessment': 0.7,  # Probability of considered failure modes
            'mitigation_strategies': []
        }
        
        effectiveness = 0.3 + (bias_detection_result.confidence_score * 0.5)
        bias_reduction = effectiveness * 0.4  # Estimate 40% potential reduction
        
        return DebiasingResult(
            result_id=f"result_{uuid.uuid4().hex[:12]}",
            strategy_applied=DebiasingStrategy.PRE_MORTEM_ANALYSIS,
            effectiveness_score=effectiveness,
            bias_reduction=bias_reduction,
            new_decision_context=updated_context,
            recommendations=[
                "Imagine the decision has failed and identify possible reasons",
                "Consider what could go wrong and plan for contingencies",
                "Conduct a systematic analysis of potential failure modes"
            ],
            timestamp=datetime.now(),
            metadata={
                "pre_mortem_elements": ["failure_scenarios", "root_causes", "mitigation_plans"],
                "original_severity": bias_detection_result.severity_level
            }
        )
    
    def _apply_consider_opportunity_cost(self, decision_context: Dict, 
                                        bias_detection_result) -> Optional[DebiasingResult]:
        """Apply strategy to consider opportunity costs."""
        updated_context = decision_context.copy()
        
        # Add opportunity cost considerations
        if 'opportunity_cost_analysis' not in updated_context:
            updated_context['opportunity_cost_analysis'] = {
                'alternative_options_valuation': True,
                'cost_comparison': True,
                'forgone_value_calculation': True
            }
        else:
            updated_context['opportunity_cost_analysis']['cost_comparison'] = True
        
        effectiveness = 0.4 + (bias_detection_result.confidence_score * 0.4)
        bias_reduction = effectiveness * 0.5  # Estimate 50% potential reduction
        
        return DebiasingResult(
            result_id=f"result_{uuid.uuid4().hex[:12]}",
            strategy_applied=DebiasingStrategy.CONSIDER_OPPORTUNITY_COST,
            effectiveness_score=effectiveness,
            bias_reduction=bias_reduction,
            new_decision_context=updated_context,
            recommendations=[
                "Evaluate what you would be giving up by choosing this option",
                "Compare the benefits of this decision to alternative uses of resources",
                "Consider the long-term implications of your choice"
            ],
            timestamp=datetime.now(),
            metadata={
                "opportunity_cost_elements": ["time", "money", "resources", "potential"],
                "original_severity": bias_detection_result.severity_level
            }
        )
    
    def _apply_red_teaming(self, decision_context: Dict, 
                          bias_detection_result) -> Optional[DebiasingResult]:
        """Apply red teaming strategy for critical evaluation."""
        updated_context = decision_context.copy()
        
        # Add red team evaluation component
        updated_context['red_team_evaluation'] = {
            'critical_review': True,
            'assumption_challenging': True,
            'alternative_perspective_consideration': True
        }
        
        effectiveness = 0.5 + (bias_detection_result.confidence_score * 0.45)
        bias_reduction = effectiveness * 0.65  # Estimate 65% potential reduction
        
        return DebiasingResult(
            result_id=f"result_{uuid.uuid4().hex[:12]}",
            strategy_applied=DebiasingStrategy.RED_TEAMING,
            effectiveness_score=effectiveness,
            bias_reduction=bias_reduction,
            new_decision_context=updated_context,
            recommendations=[
                "Have a third party critically review your decision",
                "Challenge all key assumptions systematically",
                "Consider alternative perspectives and approaches"
            ],
            timestamp=datetime.now(),
            metadata={
                "red_team_elements": ["assumption_challenging", "alternative_analysis", "critical_review"],
                "original_severity": bias_detection_result.severity_level
            }
        )
    
    def _apply_reference_class_forecasting(self, decision_context: Dict, 
                                          bias_detection_result) -> Optional[DebiasingResult]:
        """Apply reference class forecasting strategy."""
        updated_context = decision_context.copy()
        
        # Add reference class analysis
        updated_context['reference_class_analysis'] = {
            'comparable_situations': [],
            'historical_outcomes': [],
            'base_rate_statistics': {}
        }
        
        effectiveness = 0.4 + (bias_detection_result.confidence_score * 0.5)
        bias_reduction = effectiveness * 0.6  # Estimate 60% potential reduction
        
        return DebiasingResult(
            result_id=f"result_{uuid.uuid4().hex[:12]}",
            strategy_applied=DebiasingStrategy.REFERENCE_CLASS_FORECASTING,
            effectiveness_score=effectiveness,
            bias_reduction=bias_reduction,
            new_decision_context=updated_context,
            recommendations=[
                "Identify similar past situations and their outcomes",
                "Use base rate statistics from reference class situations",
                "Adjust estimates based on historical performance"
            ],
            timestamp=datetime.now(),
            metadata={
                "reference_class_elements": ["comparable_situations", "historical_outcomes", "base_rates"],
                "original_severity": bias_detection_result.severity_level
            }
        )
    
    def _apply_taking_the_outside_view(self, decision_context: Dict, 
                                      bias_detection_result) -> Optional[DebiasingResult]:
        """Apply outside view strategy."""
        updated_context = decision_context.copy()
        
        # Add outside perspective consideration
        updated_context['outside_view_consideration'] = {
            'external_benchmarks': True,
            'statistical_norms': True,
            'independent_assessment': True
        }
        
        effectiveness = 0.45 + (bias_detection_result.confidence_score * 0.4)
        bias_reduction = effectiveness * 0.55  # Estimate 55% potential reduction
        
        return DebiasingResult(
            result_id=f"result_{uuid.uuid4().hex[:12]}",
            strategy_applied=DebiasingStrategy.TAKING_THE_OUTSIDE_VIEW,
            effectiveness_score=effectiveness,
            bias_reduction=bias_reduction,
            new_decision_context=updated_context,
            recommendations=[
                "Look at the situation from an outsider's perspective",
                "Use statistical norms rather than individual characteristics",
                "Consider how similar decisions turned out for others"
            ],
            timestamp=datetime.now(),
            metadata={
                "outside_view_elements": ["external_perspective", "statistical_norms", "comparative_analysis"],
                "original_severity": bias_detection_result.severity_level
            }
        )
    
    def _apply_probability_tracking(self, decision_context: Dict, 
                                   bias_detection_result) -> Optional[DebiasingResult]:
        """Apply probability tracking strategy."""
        updated_context = decision_context.copy()
        
        # Add probability tracking mechanisms
        updated_context['probability_tracking'] = {
            'confidence_logging': True,
            'accuracy_monitoring': True,
            'calibration_adjustment': True
        }
        
        effectiveness = 0.3 + (bias_detection_result.confidence_score * 0.6)
        bias_reduction = effectiveness * 0.45  # Estimate 45% potential reduction
        
        return DebiasingResult(
            result_id=f"result_{uuid.uuid4().hex[:12]}",
            strategy_applied=DebiasingStrategy.PROBABILITY_TRACKING,
            effectiveness_score=effectiveness,
            bias_reduction=bias_reduction,
            new_decision_context=updated_context,
            recommendations=[
                "Log your confidence levels for different judgments",
                "Track the accuracy of your predictions over time",
                "Adjust your confidence levels based on past calibration"
            ],
            timestamp=datetime.now(),
            metadata={
                "probability_tracking_elements": ["confidence_logging", "accuracy_tracking", "calibration"],
                "original_severity": bias_detection_result.severity_level
            }
        )
    
    def _apply_incentive_alignment(self, decision_context: Dict, 
                                  bias_detection_result) -> Optional[DebiasingResult]:
        """Apply incentive alignment strategy."""
        updated_context = decision_context.copy()
        
        # Add incentive alignment considerations
        updated_context['incentive_alignment'] = {
            'conflict_identification': True,
            'reward_structure_review': True,
            'motivation_consideration': True
        }
        
        effectiveness = 0.35 + (bias_detection_result.confidence_score * 0.5)
        bias_reduction = effectiveness * 0.45  # Estimate 45% potential reduction
        
        return DebiasingResult(
            result_id=f"result_{uuid.uuid4().hex[:12]}",
            strategy_applied=DebiasingStrategy.INCENTIVE_ALIGNMENT,
            effectiveness_score=effectiveness,
            bias_reduction=bias_reduction,
            new_decision_context=updated_context,
            recommendations=[
                "Identify potential conflicts between incentives and objectives",
                "Review reward structures that might encourage biased thinking",
                "Align incentives with desired outcomes"
            ],
            timestamp=datetime.now(),
            metadata={
                "incentive_alignment_elements": ["conflict_review", "reward_structure", "motivation_alignment"],
                "original_severity": bias_detection_result.severity_level
            }
        )
    
    def get_effectiveness_report(self) -> Dict[str, Any]:
        """Get a report on the effectiveness of different debiasing strategies."""
        if not self.debiasing_history:
            return {"strategies_applied": 0, "average_effectiveness": 0.0}
        
        effectiveness_by_strategy = {}
        for result in self.debiasing_history:
            strategy = result.strategy_applied
            if strategy not in effectiveness_by_strategy:
                effectiveness_by_strategy[strategy] = []
            effectiveness_by_strategy[strategy].append(result.effectiveness_score)
        
        strategy_effectiveness = {}
        for strategy, scores in effectiveness_by_strategy.items():
            strategy_effectiveness[strategy.value] = {
                "average_effectiveness": statistics.mean(scores),
                "application_count": len(scores),
                "total_bias_reduction": sum([r.bias_reduction for r in 
                                           [r for r in self.debiasing_history 
                                            if r.strategy_applied == strategy]])
            }
        
        return {
            "strategies_applied": len(self.debiasing_history),
            "average_effectiveness": statistics.mean([r.effectiveness_score for r in self.debiasing_history]),
            "effectiveness_by_strategy": strategy_effectiveness,
            "recent_applications": self.debiasing_history[-10:]  # Last 10 applications
        }