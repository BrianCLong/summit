"""
Metacognitive System for IntelGraph

This module implements metacognitive awareness capabilities that allow 
cognitive agents to recognize their own cognitive biases and limitations.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Any, Optional
import statistics
import uuid


@dataclass
class SelfReflectionResult:
    """Result of a self-reflective analysis."""
    reflection_id: str
    reflection_type: str  # e.g., "decision_review", "bias_check", "accuracy_assessment"
    content: Dict[str, Any]  # The content of the reflection
    confidence_in_reflection: float  # How confident the agent is in this reflection
    improvement_suggestions: List[str]  # Suggestions for cognitive improvement
    timestamp: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        if not self.reflection_id:
            self.reflection_id = f"reflection_{uuid.uuid4().hex[:12]}"


class MetacognitiveSystem:
    """
    System for enabling agents to recognize their own cognitive biases and limitations.
    Provides self-monitoring, self-regulation, and self-reflection capabilities.
    """
    
    def __init__(self):
        self.awareness_level = 0.3  # Initial awareness level (0.0-1.0)
        self.confidence_calibration = {}  # Mapping of decision types to confidence adjustment
        self.self_reflection_history = []  # History of self-reflective processes
        self.cognitive_limitation_awareness = {}  # Awareness of specific limitations
        self.meta_learning_records = []  # Records of learning about cognitive processes
        self.calibration_history = {}  # History of confidence calibration adjustments
    
    def update_awareness(self, agent_state: Dict, decision_outcomes: List[Dict]):
        """Update agent's metacognitive awareness based on experience."""
        # Calculate the agent's calibration accuracy (difference between confidence and accuracy)
        if decision_outcomes:
            calibration_errors = []
            for outcome in decision_outcomes:
                if 'confidence' in outcome and 'correct' in outcome:
                    # Calibration error: |confidence - accuracy|
                    error = abs(outcome['confidence'] - (1.0 if outcome['correct'] else 0.0))
                    calibration_errors.append(error)
            
            if calibration_errors:
                avg_calibration_error = statistics.mean(calibration_errors)
                
                # Update awareness based on calibration accuracy
                # Higher error = higher need for awareness
                awareness_adjustment = (1.0 - avg_calibration_error) * 0.1
                self.awareness_level = max(0.1, min(1.0, self.awareness_level + awareness_adjustment))
                
                # Record this calibration experience
                self._record_calibration_experience(avg_calibration_error, len(calibration_errors))
        
        # Update awareness based on bias detection reports
        bias_reports = agent_state.get('bias_detection_reports', [])
        if bias_reports:
            avg_bias_severity = statistics.mean([report.get('severity_score', 0.3) for report in bias_reports])
            # More bias detection = higher awareness need
            awareness_adjustment = avg_bias_severity * 0.15
            self.awareness_level = max(0.1, min(1.0, self.awareness_level + awareness_adjustment))
        
        # Update cognitive limitation awareness
        self._update_cognitive_limitation_awareness(agent_state)
    
    def generate_reflection(self, decision_context: Dict, decision_result: Dict) -> SelfReflectionResult:
        """Generate self-reflective analysis of decision-making process."""
        reflection_content = {
            "decision_context_analyzed": self._analyze_decision_context(decision_context),
            "decision_outcome_assessment": self._assess_decision_outcome(decision_result),
            "process_evaluation": self._evaluate_decision_process(decision_context),
            "cognitive_bias_considerations": self._consider_potential_biases(decision_context),
            "confidence_calibration_note": self._calibrate_confidence(decision_result)
        }
        
        # Calculate confidence in this reflection based on awareness level and available data
        data_quality = len(decision_context) / (len(decision_context) + 10)  # Normalize with 10 as baseline
        reflection_confidence = (self.awareness_level * 0.6) + (data_quality * 0.4)
        
        # Generate improvement suggestions based on the reflection
        improvement_suggestions = self._generate_improvement_suggestions(reflection_content, decision_result)
        
        # Create and return the reflection result
        reflection_result = SelfReflectionResult(
            reflection_id=f"reflection_{uuid.uuid4().hex[:12]}",
            reflection_type="decision_review",
            content=reflection_content,
            confidence_in_reflection=reflection_confidence,
            improvement_suggestions=improvement_suggestions,
            timestamp=datetime.now(),
            metadata={
                "awareness_level_at_reflection": self.awareness_level,
                "decision_context_size": len(decision_context),
                "decision_result_quality": decision_result.get('quality', 'unknown')
            }
        )
        
        # Add to history
        self.self_reflection_history.append(reflection_result)
        
        # Keep only the last 200 reflections for memory efficiency
        if len(self.self_reflection_history) > 200:
            self.self_reflection_history = self.self_reflection_history[-200:]
        
        return reflection_result
    
    def trigger_bias_check(self, current_decision_context: Dict) -> SelfReflectionResult:
        """Trigger a specific bias check reflection."""
        # Analyze the current decision context for potential cognitive traps
        potential_biases = self._identify_potential_biases(current_decision_context)
        
        reflection_content = {
            "check_type": "bias_check",
            "potential_biases_identified": potential_biases,
            "cognitive_state_assessment": self._assess_current_cognitive_state(),
            "recommendations": self._generate_bias_check_recommendations(potential_biases),
            "cognitive_load": current_decision_context.get('cognitive_load', 0.5)
        }
        
        # Calculate confidence in this bias check
        bias_count = len(potential_biases)
        reflection_confidence = min(1.0, 0.4 + (bias_count * 0.1) + (self.awareness_level * 0.5))
        
        # Generate improvement suggestions
        suggestions = [
            "Consider additional perspectives before making this decision",
            "Take a step back and evaluate your reasoning process"
        ]
        suggestions.extend(self._generate_bias_specific_suggestions(potential_biases))
        
        reflection_result = SelfReflectionResult(
            reflection_id=f"bias_check_{uuid.uuid4().hex[:12]}",
            reflection_type="bias_check",
            content=reflection_content,
            confidence_in_reflection=reflection_confidence,
            improvement_suggestions=suggestions,
            timestamp=datetime.now(),
            metadata={
                "bias_count": bias_count,
                "cognitive_load": current_decision_context.get('cognitive_load', 0.5),
                "awareness_level": self.awareness_level
            }
        )
        
        self.self_reflection_history.append(reflection_result)
        return reflection_result
    
    def _analyze_decision_context(self, decision_context: Dict) -> Dict[str, Any]:
        """Analyze the decision context for reflective purposes."""
        analysis = {
            "complexity_assessment": self._assess_complexity(decision_context),
            "information_quality": self._assess_information_quality(decision_context),
            "time_pressure": decision_context.get('time_pressure', 0.0),
            "emotional_state_influence": decision_context.get('emotional_state', {}).get('influence_on_decision', 0.5),
            "cognitive_load": decision_context.get('cognitive_load', 0.5)
        }
        
        return analysis
    
    def _assess_decision_outcome(self, decision_result: Dict) -> Dict[str, Any]:
        """Assess the outcome of a decision."""
        # Ensure we're working with numeric values
        expected_outcome = decision_result.get('expected_outcome', 0.5)
        actual_outcome = decision_result.get('actual_outcome', 0.5)
        
        # Convert to float if they're strings
        if isinstance(expected_outcome, str):
            try:
                expected_outcome = float(expected_outcome)
            except ValueError:
                expected_outcome = 0.5
                
        if isinstance(actual_outcome, str):
            try:
                actual_outcome = float(actual_outcome)
            except ValueError:
                actual_outcome = 0.5
        
        outcome_assessment = {
            "expected_vs_actual": {
                "expected_value": expected_outcome,
                "actual_value": actual_outcome,
                "difference": expected_outcome - actual_outcome
            },
            "confidence_accuracy": {
                "stated_confidence": decision_result.get('confidence', 0.5),
                "accuracy": decision_result.get('accuracy', 0.0)
            },
            "decision_quality": decision_result.get('quality', 'unknown')
        }
        
        return outcome_assessment
    
    def _evaluate_decision_process(self, decision_context: Dict) -> Dict[str, Any]:
        """Evaluate the decision-making process."""
        process_evaluation = {
            "information_gathering": decision_context.get('information_gathering_method', 'unknown'),
            "alternative_consideration": decision_context.get('alternatives_considered', 1),
            "consultation": decision_context.get('consultation_occurred', False),
            "time_taken": decision_context.get('decision_time', 0.0),
            "process_adherence": decision_context.get('followed_process', True)
        }
        
        return process_evaluation
    
    def _consider_potential_biases(self, decision_context: Dict) -> Dict[str, Any]:
        """Consider potential biases in the decision context."""
        potential_biases = {
            "availability_bias": decision_context.get('reliance_on_recent_info', 0.0),
            "confirmation_bias_risk": decision_context.get('seeking_confirming_evidence', 0.0),
            "anchoring_risk": decision_context.get('influence_of_initial_info', 0.0),
            "framing_influence": decision_context.get('presentation_dependency', 0.0)
        }
        
        return potential_biases
    
    def _calibrate_confidence(self, decision_result: Dict) -> Dict[str, Any]:
        """Calibrate confidence based on decision outcome."""
        # If we have information about expected vs actual outcomes
        expected = decision_result.get('expected_outcome', 0.5)
        actual = decision_result.get('actual_outcome', 0.5)
        confidence = decision_result.get('confidence', 0.5)
        
        # Convert to float if they're strings
        if isinstance(expected, str):
            try:
                expected = float(expected)
            except ValueError:
                expected = 0.5
                
        if isinstance(actual, str):
            try:
                actual = float(actual)
            except ValueError:
                actual = 0.5
        
        # Calculate calibration error
        calibration_error = abs(confidence - (1 if abs(expected - actual) < 0.1 else 0))
        
        # Adjust confidence calibration mapping
        decision_type = decision_result.get('decision_type', 'general')
        if decision_type not in self.confidence_calibration:
            self.confidence_calibration[decision_type] = 1.0  # No adjustment initially
        
        # Update calibration if we have sufficient data
        if calibration_error > 0.3:  # Significant miscalibration
            # If agent was overconfident, reduce calibration factor
            if confidence > (1 if abs(expected - actual) < 0.1 else 0):
                self.confidence_calibration[decision_type] *= 0.95  # Reduce confidence
            else:
                # If agent was underconfident, increase calibration factor
                self.confidence_calibration[decision_type] *= 1.05  # Increase confidence
            
            # Keep calibration factor in reasonable bounds
            self.confidence_calibration[decision_type] = max(0.5, min(1.5, 
                                                                      self.confidence_calibration[decision_type]))
        
        return {
            "original_confidence": confidence,
            "calibration_factor": self.confidence_calibration.get(decision_type, 1.0),
            "calibration_error": calibration_error,
            "adjustment_applied": calibration_error > 0.3
        }
    
    def _identify_potential_biases(self, decision_context: Dict) -> List[Dict[str, Any]]:
        """Identify potential biases in current decision context."""
        potential_biases = []
        
        # Check for availability heuristic
        if decision_context.get('reliance_on_recent_info', 0) > 0.7:
            potential_biases.append({
                "type": "availability_heuristic",
                "severity": decision_context.get('reliance_on_recent_info', 0),
                "evidence": "Heavy reliance on recent or memorable information"
            })
        
        # Check for confirmation bias
        if decision_context.get('seeking_confirming_evidence', 0) > 0.7:
            potential_biases.append({
                "type": "confirmation_bias",
                "severity": decision_context.get('seeking_confirming_evidence', 0),
                "evidence": "Tendency to seek information that confirms existing beliefs"
            })
        
        # Check for anchoring bias
        if decision_context.get('influence_of_initial_info', 0) > 0.7:
            potential_biases.append({
                "type": "anchoring_bias",
                "severity": decision_context.get('influence_of_initial_info', 0),
                "evidence": "High influence of initial values or estimates"
            })
        
        # Check for emotional influence
        emotional_state = decision_context.get('emotional_state', {})
        if emotional_state.get('intensity', 0) > 0.6 and emotional_state.get('influence_on_decision', 0) > 0.5:
            potential_biases.append({
                "type": "emotional_bias",
                "severity": emotional_state.get('influence_on_decision', 0),
                "evidence": f"Emotional state {emotional_state.get('dominant_emotion', 'unknown')} affecting decision"
            })
        
        # Check for cognitive load effects
        if decision_context.get('cognitive_load', 0) > 0.8:
            potential_biases.append({
                "type": "cognitive_overload",
                "severity": decision_context.get('cognitive_load', 0),
                "evidence": "High cognitive load impairing judgment"
            })
        
        return potential_biases
    
    def _assess_current_cognitive_state(self) -> Dict[str, Any]:
        """Assess the agent's current cognitive state."""
        return {
            "awareness_level": self.awareness_level,
            "cognitive_limitations_acknowledged": dict(self.cognitive_limitation_awareness),
            "recent_reflection_count": len(self.self_reflection_history[-10:]),  # Last 10 reflections
            "calibration_status": {
                k: v for k, v in self.confidence_calibration.items()
            }
        }
    
    def _generate_bias_check_recommendations(self, potential_biases: List[Dict[str, Any]]) -> List[str]:
        """Generate recommendations based on identified potential biases."""
        recommendations = []
        
        for bias in potential_biases:
            bias_type = bias['type']
            if bias_type == "availability_heuristic":
                recommendations.append("Seek statistical data rather than relying on memorable examples")
            elif bias_type == "confirmation_bias":
                recommendations.append("Actively look for disconfirming evidence")
            elif bias_type == "anchoring_bias":
                recommendations.append("Consider alternative anchor points and adjust more substantially")
            elif bias_type == "emotional_bias":
                recommendations.append(f"Take time to cool down before making this decision when {bias['evidence']}")
            elif bias_type == "cognitive_overload":
                recommendations.append("Simplify the decision or break it into smaller parts")
        
        return recommendations
    
    def _generate_bias_specific_suggestions(self, potential_biases: List[Dict[str, Any]]) -> List[str]:
        """Generate bias-specific improvement suggestions."""
        suggestions = []
        
        if any(b['type'] == "availability_heuristic" for b in potential_biases):
            suggestions.append("Use base rate statistics rather than memorable examples")
        
        if any(b['type'] == "confirmation_bias" for b in potential_biases):
            suggestions.append("Play devil's advocate with your own reasoning")
        
        if any(b['type'] == "anchoring_bias" for b in potential_biases):
            suggestions.append("Start from different reference points and compare outcomes")
        
        if any(b['type'] == "emotional_bias" for b in potential_biases):
            suggestions.append("Wait until emotional state stabilizes before deciding")
        
        if any(b['type'] == "cognitive_overload" for b in potential_biases):
            suggestions.append("Reduce decision complexity or seek assistance")
        
        return suggestions
    
    def _generate_improvement_suggestions(self, reflection_content: Dict, decision_result: Dict) -> List[str]:
        """Generate improvement suggestions based on reflection content."""
        suggestions = []
        
        # Based on decision outcome
        if decision_result.get('quality') == 'poor':
            suggestions.append("Spend more time evaluating this type of decision in the future")
            suggestions.append("Consider seeking additional input before making similar decisions")
        
        # Based on process evaluation
        process_eval = reflection_content.get("process_evaluation", {})
        if not process_eval.get("consultation", False):
            suggestions.append("Consider consulting others for important decisions")
        
        if process_eval.get("alternatives_considered", 1) < 2:
            suggestions.append("Make sure to consider multiple alternatives before deciding")
        
        # Based on bias considerations
        biases = reflection_content.get("cognitive_bias_considerations", {})
        if biases.get("availability_bias", 0) > 0.5:
            suggestions.append("Look for statistical evidence rather than memorable examples")
        
        if biases.get("confirmation_bias_risk", 0) > 0.5:
            suggestions.append("Actively seek out information that challenges your initial view")
        
        # Based on cognitive state
        if reflection_content.get("cognitive_load", 0.5) > 0.7:
            suggestions.append("Simplify complex decisions or break them into smaller parts")
        
        # Default suggestions if no specific ones
        if not suggestions:
            suggestions.extend([
                "Document your decision-making process for future reference",
                "Consider how you could approach similar decisions differently",
                "Evaluate whether you had sufficient information before deciding"
            ])
        
        return suggestions
    
    def _assess_complexity(self, decision_context: Dict) -> str:
        """Assess the complexity of a decision context."""
        factors = [
            decision_context.get('options_count', 1),
            len(decision_context.get('constraints', [])),
            len(decision_context.get('stakeholders', [])),
            decision_context.get('time_pressure', 0),
        ]
        
        avg_factor = statistics.mean(factors) if factors else 1
        
        if avg_factor < 2:
            return "low"
        elif avg_factor < 4:
            return "medium"
        else:
            return "high"
    
    def _assess_information_quality(self, decision_context: Dict) -> Dict[str, float]:
        """Assess the quality of information in the decision context."""
        sources_count = decision_context.get('information_sources_count', 1)
        source_variety = decision_context.get('source_variety_score', 0.5)
        information_completeness = decision_context.get('information_completeness', 0.5)
        
        return {
            "sources_count": sources_count,
            "source_variety": source_variety,
            "completeness": information_completeness,
            "overall_quality": (source_variety + information_completeness) / 2
        }
    
    def _record_calibration_experience(self, error: float, sample_size: int):
        """Record a calibration experience in history."""
        timestamp = datetime.now()
        key = timestamp.strftime("%Y-%m")  # Monthly buckets for calibration history
        
        if key not in self.calibration_history:
            self.calibration_history[key] = []
        
        self.calibration_history[key].append({
            "error": error,
            "sample_size": sample_size,
            "timestamp": timestamp
        })
        
        # Keep only the last 12 months of data
        recent_keys = sorted(self.calibration_history.keys())[-12:]
        self.calibration_history = {
            k: v for k, v in self.calibration_history.items() if k in recent_keys
        }
    
    def _update_cognitive_limitation_awareness(self, agent_state: Dict):
        """Update awareness of specific cognitive limitations."""
        # Update based on recent performance
        recent_performance = agent_state.get('recent_performance', {})
        
        if 'decision_accuracy_trend' in recent_performance:
            # If accuracy is declining, increase awareness of limitations
            if recent_performance['decision_accuracy_trend'] == 'declining':
                self.cognitive_limitation_awareness['decision_accuracy'] = max(
                    0.3, 
                    self.cognitive_limitation_awareness.get('decision_accuracy', 0.2) + 0.1
                )
        
        if 'cognitive_load_history' in recent_performance:
            # If cognitive load has been consistently high, acknowledge this limitation
            avg_load = statistics.mean(recent_performance['cognitive_load_history'])
            if avg_load > 0.7:
                self.cognitive_limitation_awareness['cognitive_load'] = avg_load
        
        # Update based on feedback
        feedback = agent_state.get('recent_feedback', [])
        negative_feedback_count = sum(1 for f in feedback if f.get('type') == 'negative')
        if negative_feedback_count > 2:  # If multiple negative feedbacks
            self.cognitive_limitation_awareness['feedback_responsiveness'] = max(
                0.4,
                self.cognitive_limitation_awareness.get('feedback_responsiveness', 0.3) + 0.1
            )
    
    def get_awareness_report(self) -> Dict[str, Any]:
        """Get a comprehensive report on metacognitive awareness."""
        return {
            "awareness_level": self.awareness_level,
            "cognitive_limitation_awareness": dict(self.cognitive_limitation_awareness),
            "self_reflection_frequency": len(self.self_reflection_history),
            "confidence_calibration_status": dict(self.confidence_calibration),
            "calibration_history_summary": {
                k: {
                    "avg_error": statistics.mean([item["error"] for item in v]),
                    "total_experiences": len(v)
                } for k, v in self.calibration_history.items()
            },
            "meta_learning_count": len(self.meta_learning_records),
            "recent_reflections": [r.content for r in self.self_reflection_history[-5:]]  # Last 5 reflections
        }