"""
Cognitive Bias Mitigation Engine for IntelGraph

This module implements a comprehensive system for detecting, mitigating, and 
managing cognitive biases in cognitive agents' decision-making processes.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Callable, Any, Optional
from enum import Enum
import statistics
import uuid
from collections import defaultdict


class BiasType(Enum):
    """Types of cognitive biases that can be detected."""
    CONFIRMATION_BIAS = "confirmation_bias"
    AVAILABILITY_HEURISTIC = "availability_heuristic"
    ANCHORING_BIAS = "anchoring_bias"
    HINDSIGHT_BIAS = "hindsight_bias"
    OPTIMISM_BIAS = "optimism_bias"
    LOSS_AVERSION = "loss_aversion"
    STATUS_QUO_BIAS = "status_quo_bias"
    OVERCONFIDENCE_EFFECT = "overconfidence_effect"
    SUNK_COST_FALLACY = "sunk_cost_fallacy"
    FRAMING_EFFECT = "framing_effect"


@dataclass
class BiasDetectionResult:
    """Result of bias detection in a decision-making context."""
    detection_id: str
    bias_type: BiasType
    confidence_score: float  # 0.0 to 1.0
    severity_level: str  # "low", "medium", "high", "critical"
    impact_assessment: Dict[str, Any]  # Assessment of bias impact on decision
    recommendation: str  # Recommendation for mitigation
    timestamp: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        if not self.detection_id:
            self.detection_id = f"detection_{uuid.uuid4().hex[:12]}"


class BiasDetector:
    """
    Core class for detecting cognitive biases in decision-making processes.
    """
    
    def __init__(self):
        self.bias_identifiers = {}  # Mapping of bias types to detection functions
        self.detection_thresholds = self._initialize_thresholds()
        self.detection_history = defaultdict(list)  # Historical bias detection records
        self._register_default_bias_detectors()
    
    def _initialize_thresholds(self) -> Dict[BiasType, float]:
        """Initialize detection thresholds for different biases."""
        return {
            BiasType.CONFIRMATION_BIAS: 0.6,
            BiasType.AVAILABILITY_HEURISTIC: 0.6,
            BiasType.ANCHORING_BIAS: 0.6,
            BiasType.HINDSIGHT_BIAS: 0.6,
            BiasType.OPTIMISM_BIAS: 0.6,
            BiasType.LOSS_AVERSION: 0.6,
            BiasType.STATUS_QUO_BIAS: 0.6,
            BiasType.OVERCONFIDENCE_EFFECT: 0.6,
            BiasType.SUNK_COST_FALLACY: 0.6,
            BiasType.FRAMING_EFFECT: 0.6
        }
    
    def _register_default_bias_detectors(self):
        """Register default bias detection algorithms."""
        self.register_bias_identifier(BiasType.CONFIRMATION_BIAS, self._detect_confirmation_bias)
        self.register_bias_identifier(BiasType.AVAILABILITY_HEURISTIC, self._detect_availability_heuristic)
        self.register_bias_identifier(BiasType.ANCHORING_BIAS, self._detect_anchoring_bias)
        self.register_bias_identifier(BiasType.HINDSIGHT_BIAS, self._detect_hindsight_bias)
        self.register_bias_identifier(BiasType.OPTIMISM_BIAS, self._detect_optimism_bias)
        self.register_bias_identifier(BiasType.LOSS_AVERSION, self._detect_loss_aversion)
        self.register_bias_identifier(BiasType.STATUS_QUO_BIAS, self._detect_status_quo_bias)
        self.register_bias_identifier(BiasType.OVERCONFIDENCE_EFFECT, self._detect_overconfidence_effect)
        self.register_bias_identifier(BiasType.SUNK_COST_FALLACY, self._detect_sunk_cost_fallacy)
        self.register_bias_identifier(BiasType.FRAMING_EFFECT, self._detect_framing_effect)
    
    def register_bias_identifier(self, bias_type: BiasType, identifier_func: Callable):
        """Register a new bias detection algorithm."""
        self.bias_identifiers[bias_type] = identifier_func
    
    def detect_bias(self, decision_context: Dict, agent_state: Dict) -> List[BiasDetectionResult]:
        """Detect potential cognitive biases in decision-making."""
        detection_results = []
        
        for bias_type, detector_func in self.bias_identifiers.items():
            result = detector_func(decision_context, agent_state)
            if result:
                detection_results.append(result)
        
        # Sort by confidence score in descending order
        detection_results.sort(key=lambda x: x.confidence_score, reverse=True)
        
        # Record in history
        for result in detection_results:
            self.detection_history[result.bias_type].append(result)
            
            # Keep only the last 100 detections for memory efficiency
            if len(self.detection_history[result.bias_type]) > 100:
                self.detection_history[result.bias_type] = \
                    self.detection_history[result.bias_type][-100:]
        
        return detection_results
    
    def _detect_confirmation_bias(self, decision_context: Dict, agent_state: Dict) -> Optional[BiasDetectionResult]:
        """Detect confirmation bias based on information seeking and interpretation patterns."""
        # Look for signs of confirmation bias:
        # - Tendency to seek information that confirms existing beliefs
        # - Disregard for disconfirming evidence
        # - Selective exposure to supportive sources
        
        # Check if the agent is disproportionately focusing on information that confirms their current view
        if 'evidence' in decision_context and 'current_belief' in decision_context:
            evidence = decision_context['evidence']
            current_belief = decision_context['current_belief']
            
            # Calculate proportion of confirming vs disconfirming evidence
            confirming_count = sum(1 for item in evidence if 
                                 item.get('supports', False) == current_belief)
            total_count = len(evidence)
            
            if total_count > 0:
                confirming_ratio = confirming_count / total_count
                
                # Flag if the ratio is significantly high (>80%)
                if confirming_ratio > 0.8:
                    confidence_score = min(1.0, confirming_ratio)
                    severity = "high" if confirming_ratio > 0.9 else "medium"
                    
                    return BiasDetectionResult(
                        detection_id=f"detection_{uuid.uuid4().hex[:12]}",
                        bias_type=BiasType.CONFIRMATION_BIAS,
                        confidence_score=confidence_score,
                        severity_level=severity,
                        impact_assessment={
                            "confirming_ratio": confirming_ratio,
                            "total_evidence_count": total_count,
                            "potential_impact": "Agent may be ignoring disconfirming evidence"
                        },
                        recommendation="Actively seek disconfirming evidence and consider alternative viewpoints",
                        timestamp=datetime.now(),
                        metadata={
                            "evidence_analysis": {
                                "confirming_count": confirming_count,
                                "disconfirming_count": total_count - confirming_count
                            }
                        }
                    )
        
        return None
    
    def _detect_availability_heuristic(self, decision_context: Dict, agent_state: Dict) -> Optional[BiasDetectionResult]:
        """Detect availability heuristic based on decision-making patterns."""
        # Look for signs of availability heuristic:
        # - Decisions based on memorable or recent examples
        # - Overestimating likelihood of salient events
        
        if 'decision_factors' in decision_context and 'memory_recall' in agent_state:
            decision_factors = decision_context['decision_factors']
            memory_recall = agent_state['memory_recall']  # How recently/often info was recalled
            
            # Check if decisions are based too heavily on recently recalled information
            if 'recency_bias' in memory_recall:
                recency_score = memory_recall['recency_bias']
                
                if recency_score > 0.7:  # If heavily based on recent info
                    confidence_score = recency_score
                    severity = "high" if recency_score > 0.85 else "medium"
                    
                    return BiasDetectionResult(
                        detection_id=f"detection_{uuid.uuid4().hex[:12]}",
                        bias_type=BiasType.AVAILABILITY_HEURISTIC,
                        confidence_score=confidence_score,
                        severity_level=severity,
                        impact_assessment={
                            "recency_score": recency_score,
                            "potential_impact": "Decision may be based on memorable but unrepresentative examples"
                        },
                        recommendation="Consider base rate statistics and systematically evaluate all relevant information",
                        timestamp=datetime.now(),
                        metadata={
                            "memory_recall_pattern": memory_recall
                        }
                    )
        
        return None
    
    def _detect_anchoring_bias(self, decision_context: Dict, agent_state: Dict) -> Optional[BiasDetectionResult]:
        """Detect anchoring bias based on initial value influence."""
        # Look for signs of anchoring bias:
        # - Undue influence of initial values or estimates
        # - Insufficient adjustment from anchor points
        
        if 'initial_estimate' in decision_context and 'final_estimate' in decision_context:
            initial = decision_context['initial_estimate']
            final = decision_context['final_estimate']
            adjustment = decision_context.get('adjustment_process', {})
            
            # Check if adjustment from anchor was insufficient
            if isinstance(initial, (int, float)) and isinstance(final, (int, float)):
                if abs(initial) > 0:  # Avoid division by zero
                    change_ratio = abs(final - initial) / abs(initial)
                    
                    # If little change from initial value, could indicate anchoring
                    if change_ratio < 0.3:  # Less than 30% adjustment
                        confidence_score = min(1.0, 1.0 - change_ratio)
                        severity = "high" if change_ratio < 0.1 else "medium"
                        
                        return BiasDetectionResult(
                            detection_id=f"detection_{uuid.uuid4().hex[:12]}",
                            bias_type=BiasType.ANCHORING_BIAS,
                            confidence_score=confidence_score,
                            severity_level=severity,
                            impact_assessment={
                                "initial_value": initial,
                                "final_value": final,
                                "change_ratio": change_ratio,
                                "potential_impact": "Final decision may be unduly influenced by initial anchor"
                            },
                            recommendation="Consider alternative starting points and adjust more substantially from initial estimates",
                            timestamp=datetime.now(),
                            metadata={
                                "adjustment_process": adjustment
                            }
                        )
        
        return None
    
    def _detect_hindsight_bias(self, decision_context: Dict, agent_state: Dict) -> Optional[BiasDetectionResult]:
        """Detect hindsight bias based on post-hoc certainty."""
        # Look for signs of hindsight bias:
        # - Believing an outcome was predictable after it occurred
        # - Overstating one's prior knowledge of outcome
        
        if 'outcome_known' in decision_context and decision_context.get('outcome_known', False):
            if 'predicted_confidence' in decision_context and 'post_hoc_confidence' in decision_context:
                predicted = decision_context['predicted_confidence']
                post_hoc = decision_context['post_hoc_confidence']
                
                # If post-hoc confidence is significantly higher than predicted confidence
                if post_hoc > predicted + 0.2:  # 20% difference threshold
                    confidence_score = min(1.0, (post_hoc - predicted) / 0.5)  # Normalize to 0-1
                    severity = "high" if post_hoc - predicted > 0.35 else "medium"
                    
                    return BiasDetectionResult(
                        detection_id=f"detection_{uuid.uuid4().hex[:12]}",
                        bias_type=BiasType.HINDSIGHT_BIAS,
                        confidence_score=confidence_score,
                        severity_level=severity,
                        impact_assessment={
                            "predicted_confidence": predicted,
                            "post_hoc_confidence": post_hoc,
                            "confidence_difference": post_hoc - predicted,
                            "potential_impact": "Agent may be overestimating their ability to predict outcomes"
                        },
                        recommendation="Document predictions before outcomes are known to maintain accurate self-assessment",
                        timestamp=datetime.now(),
                        metadata={
                            "confidence_trajectory": {
                                "predicted": predicted,
                                "post_hoc": post_hoc
                            }
                        }
                    )
        
        return None
    
    def _detect_optimism_bias(self, decision_context: Dict, agent_state: Dict) -> Optional[BiasDetectionResult]:
        """Detect optimism bias based on outcome expectations."""
        # Look for signs of optimism bias:
        # - Overestimating probability of positive outcomes
        # - Underestimating probability of negative outcomes
        
        if 'expected_outcomes' in decision_context:
            expected_outcomes = decision_context['expected_outcomes']
            
            # Check if expectations are overly favorable
            if 'positive_outlook' in expected_outcomes and 'negative_outlook' in expected_outcomes:
                pos_outlook = expected_outcomes['positive_outlook']
                neg_outlook = expected_outcomes['negative_outlook']
                
                # If positive outlook is disproportionately high compared to negative
                if pos_outlook > 0.8 and neg_outlook < 0.2:
                    confidence_score = min(1.0, pos_outlook)
                    severity = "high" if pos_outlook > 0.9 else "medium"
                    
                    return BiasDetectionResult(
                        detection_id=f"detection_{uuid.uuid4().hex[:12]}",
                        bias_type=BiasType.OPTIMISM_BIAS,
                        confidence_score=confidence_score,
                        severity_level=severity,
                        impact_assessment={
                            "positive_outlook": pos_outlook,
                            "negative_outlook": neg_outlook,
                            "potential_impact": "Agent may be underestimating risks and challenges"
                        },
                        recommendation="Consider base rate statistics for similar situations and plan for potential negative outcomes",
                        timestamp=datetime.now(),
                        metadata={
                            "outcome_expectations": expected_outcomes
                        }
                    )
        
        return None
    
    def _detect_loss_aversion(self, decision_context: Dict, agent_state: Dict) -> Optional[BiasDetectionResult]:
        """Detect loss aversion bias based on decision patterns."""
        # Look for signs of loss aversion:
        # - Disutility of losing something is greater than utility of gaining same thing
        # - Risk aversion in gain situations, risk-seeking in loss situations
        
        if 'gains' in decision_context and 'losses' in decision_context:
            gains = decision_context['gains']
            losses = decision_context['losses']
            risk_preference = decision_context.get('risk_preference', {})
            
            # Check if losses are weighted more heavily than gains
            if isinstance(gains, (int, float)) and isinstance(losses, (int, float)):
                # If the agent is avoiding risks that involve potential gains
                if gains > 0 and losses < 0:
                    if risk_preference.get('gain_risk_tolerance', 0.5) < 0.3:
                        confidence_score = 1.0 - risk_preference.get('gain_risk_tolerance', 0.5)
                        severity = "high" if risk_preference.get('gain_risk_tolerance', 0.5) < 0.15 else "medium"
                        
                        return BiasDetectionResult(
                            detection_id=f"detection_{uuid.uuid4().hex[:12]}",
                            bias_type=BiasType.LOSS_AVERSION,
                            confidence_score=confidence_score,
                            severity_level=severity,
                            impact_assessment={
                                "gain_risk_tolerance": risk_preference.get('gain_risk_tolerance', 0.5),
                                "potential_impact": "Agent may be overly cautious and missing beneficial opportunities"
                            },
                            recommendation="Consider the potential benefits more equally with potential risks",
                            timestamp=datetime.now(),
                            metadata={
                                "risk_preferences": risk_preference,
                                "gains": gains,
                                "losses": losses
                            }
                        )
        
        return None
    
    def _detect_status_quo_bias(self, decision_context: Dict, agent_state: Dict) -> Optional[BiasDetectionResult]:
        """Detect status quo bias based on preference for current state."""
        # Look for signs of status quo bias:
        # - Preference for current situation
        # - Resistance to change
        
        if 'change_options' in decision_context and 'current_state' in decision_context:
            change_options = decision_context['change_options']
            current_state = decision_context['current_state']
            preference_strength = decision_context.get('preference_strength', {})
            
            # Check if there's excessive preference for current state
            if preference_strength.get('current_state_preference', 0.5) > 0.7:
                confidence_score = preference_strength.get('current_state_preference', 0.5)
                severity = "high" if preference_strength.get('current_state_preference', 0.5) > 0.85 else "medium"
                
                return BiasDetectionResult(
                    detection_id=f"detection_{uuid.uuid4().hex[:12]}",
                    bias_type=BiasType.STATUS_QUO_BIAS,
                    confidence_score=confidence_score,
                    severity_level=severity,
                    impact_assessment={
                        "current_state_preference": preference_strength.get('current_state_preference', 0.5),
                        "potential_impact": "Agent may be avoiding beneficial changes"
                    },
                    recommendation="Evaluate change options objectively without giving automatic preference to current state",
                    timestamp=datetime.now(),
                    metadata={
                        "preference_strengths": preference_strength,
                        "change_options_count": len(change_options) if isinstance(change_options, list) else 0
                    }
                )
        
        return None
    
    def _detect_overconfidence_effect(self, decision_context: Dict, agent_state: Dict) -> Optional[BiasDetectionResult]:
        """Detect overconfidence effect based on self-assessment."""
        # Look for signs of overconfidence:
        # - Overestimating one's abilities, knowledge, or likelihood of success
        
        if 'self_assessment' in decision_context and 'actual_performance' in agent_state:
            self_assessment = decision_context['self_assessment']
            actual_performance = agent_state['actual_performance']
            
            # Compare self-assessment with actual performance
            if isinstance(self_assessment, (int, float)) and isinstance(actual_performance, (int, float)):
                if self_assessment > actual_performance + 0.15:  # 15% threshold
                    confidence_score = min(1.0, (self_assessment - actual_performance) / 0.5)
                    severity = "high" if self_assessment - actual_performance > 0.25 else "medium"
                    
                    return BiasDetectionResult(
                        detection_id=f"detection_{uuid.uuid4().hex[:12]}",
                        bias_type=BiasType.OVERCONFIDENCE_EFFECT,
                        confidence_score=confidence_score,
                        severity_level=severity,
                        impact_assessment={
                            "self_assessment": self_assessment,
                            "actual_performance": actual_performance,
                            "confidence_gap": self_assessment - actual_performance,
                            "potential_impact": "Agent may be making overly bold decisions based on inflated self-assessment"
                        },
                        recommendation="Seek external verification and consider previous performance when assessing capabilities",
                        timestamp=datetime.now(),
                        metadata={
                            "performance_assessment": {
                                "self_assessed": self_assessment,
                                "actual": actual_performance
                            }
                        }
                    )
        
        return None
    
    def _detect_sunk_cost_fallacy(self, decision_context: Dict, agent_state: Dict) -> Optional[BiasDetectionResult]:
        """Detect sunk cost fallacy based on investment considerations."""
        # Look for signs of sunk cost fallacy:
        # - Continuing a losing course of action due to invested resources
        
        if 'sunk_costs' in decision_context and 'continuation_decision' in decision_context:
            sunk_costs = decision_context['sunk_costs']
            continuation_decision = decision_context['continuation_decision']
            
            # Check if decision is influenced by previous investments
            if continuation_decision and sunk_costs.get('amount_invested', 0) > 0:
                if sunk_costs.get('negative_outlook', False):
                    confidence_score = min(1.0, sunk_costs.get('amount_invested', 0) / 100)  # Normalize
                    severity = "high" if sunk_costs.get('amount_invested', 0) > 50 else "medium"
                    
                    return BiasDetectionResult(
                        detection_id=f"detection_{uuid.uuid4().hex[:12]}",
                        bias_type=BiasType.SUNK_COST_FALLACY,
                        confidence_score=confidence_score,
                        severity_level=severity,
                        impact_assessment={
                            "sunk_cost_amount": sunk_costs.get('amount_invested', 0),
                            "negative_outlook": sunk_costs.get('negative_outlook', False),
                            "potential_impact": "Agent may be making suboptimal decisions based on past investments"
                        },
                        recommendation="Consider only future costs and benefits, not past investments, when making current decisions",
                        timestamp=datetime.now(),
                        metadata={
                            "sunk_cost_analysis": sunk_costs,
                            "continuation_factors": continuation_decision
                        }
                    )
        
        return None
    
    def _detect_framing_effect(self, decision_context: Dict, agent_state: Dict) -> Optional[BiasDetectionResult]:
        """Detect framing effect based on presentation influence."""
        # Look for signs of framing effect:
        # - Different decisions based on how information is presented
        
        if 'decision_frame' in decision_context and 'alternatives' in decision_context:
            decision_frame = decision_context['decision_frame']
            alternatives = decision_context['alternatives']
            
            # Check if decision varies significantly based on presentation
            if 'presentation_bias' in decision_frame:
                presentation_score = decision_frame['presentation_bias']
                
                if presentation_score > 0.6:
                    confidence_score = presentation_score
                    severity = "high" if presentation_score > 0.8 else "medium"
                    
                    return BiasDetectionResult(
                        detection_id=f"detection_{uuid.uuid4().hex[:12]}",
                        bias_type=BiasType.FRAMING_EFFECT,
                        confidence_score=confidence_score,
                        severity_level=severity,
                        impact_assessment={
                            "presentation_influence": presentation_score,
                            "potential_impact": "Decision may be influenced by how options are presented"
                        },
                        recommendation="Focus on the substance of options rather than their presentation",
                        timestamp=datetime.now(),
                        metadata={
                            "presentation_analysis": decision_frame,
                            "alternative_options": alternatives
                        }
                    )
        
        return None
    
    def get_bias_statistics(self, bias_type: BiasType) -> Dict[str, Any]:
        """Get statistics about detected instances of a specific bias."""
        bias_detections = self.detection_history[bias_type]
        
        if not bias_detections:
            return {
                "total_detections": 0,
                "avg_confidence": 0.0,
                "severity_distribution": {}
            }
        
        avg_confidence = statistics.mean([d.confidence_score for d in bias_detections])
        severity_counts = defaultdict(int)
        
        for detection in bias_detections:
            severity_counts[detection.severity_level] += 1
        
        return {
            "total_detections": len(bias_detections),
            "avg_confidence": avg_confidence,
            "severity_distribution": dict(severity_counts),
            "recent_detections": bias_detections[-5:]  # Last 5 detections
        }