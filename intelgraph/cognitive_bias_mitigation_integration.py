"""
Integration Module for Cognitive Bias Mitigation System

This module integrates the BiasDetector, DebiasingEngine, and MetacognitiveSystem
with the existing IntelGraph cognitive modeling architecture.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime

# Import the components we created
from .cognitive_bias_detector import BiasDetector, BiasDetectionResult
from .debiasing_engine import DebiasingEngine, DebiasingResult
from .metacognitive_system import MetacognitiveSystem, SelfReflectionResult

# Import from existing cognitive modeling system
from .cognitive_modeling import CognitiveAgent, AdvancedCognitiveOS


class CognitiveBiasMitigationSystem:
    """
    Main integration class that combines all cognitive bias mitigation components.
    """
    
    def __init__(self):
        self.bias_detector = BiasDetector()
        self.debiasing_engine = DebiasingEngine()
        self.metacognitive_system = MetacognitiveSystem()
        
        self.mitigation_history = []
    
    def analyze_decision_context(self, agent: CognitiveAgent, decision_context: Dict) -> Dict[str, Any]:
        """
        Analyze a decision context for potential cognitive biases and mitigation strategies.
        """
        # Create agent state representation for bias detection
        agent_state = self._create_agent_state(agent)
        
        # Detect potential biases
        bias_detections = self.bias_detector.detect_bias(decision_context, agent_state)
        
        # Apply debiasing strategies if biases are detected
        debiasing_results = []
        for detection in bias_detections:
            debiasing_result = self.debiasing_engine.apply_debiasing(detection, decision_context)
            debiasing_results.extend(debiasing_result)
        
        # Generate metacognitive reflection
        reflection_result = self.metacognitive_system.generate_reflection(
            decision_context, 
            {"quality": "pending", "expected_outcome": 0.5}
        )
        
        # Update metacognitive awareness based on this analysis
        self.metacognitive_system.update_awareness(
            agent_state, 
            [{"confidence": 0.5, "correct": True}]  # Placeholder for now
        )
        
        # Prepare comprehensive result
        result = {
            "timestamp": datetime.now(),
            "agent_id": agent.agent_id,
            "bias_detections": [self._detection_to_dict(d) for d in bias_detections],
            "debiasing_results": [self._debiasing_to_dict(d) for d in debiasing_results],
            "metacognitive_reflection": self._reflection_to_dict(reflection_result),
            "mitigation_recommendations": self._compile_recommendations(
                bias_detections, 
                debiasing_results, 
                reflection_result
            ),
            "awareness_level": self.metacognitive_system.awareness_level
        }
        
        # Add to history
        self.mitigation_history.append(result)
        
        return result
    
    def _create_agent_state(self, agent: CognitiveAgent) -> Dict[str, Any]:
        """Convert CognitiveAgent state to a dictionary format for bias detection."""
        return {
            "personality_profile": agent.personality_profile,
            "emotional_state": agent.emotional_state,
            "cognitive_load": agent.cognitive_load,
            "stress_level": agent.stress_level,
            "energy_level": agent.energy_level,
            "motivation_level": agent.motivation_level,
            "attention_span": agent.attention_span,
            "memory_strength": agent.memory_strength,
            "cognitive_biases": agent.cognitive_biases,
            "current_state": agent.current_state,
            "memory_recall": {
                "recency_bias": agent.cognitive_load * 0.3 + agent.stress_level * 0.2
            },
            "decision_history": agent.decision_history[-10:] if agent.decision_history else [],  # Last 10 decisions
            "bias_detection_reports": []  # Would be populated with historical bias detections
        }
    
    def _detection_to_dict(self, detection: BiasDetectionResult) -> Dict[str, Any]:
        """Convert BiasDetectionResult to dictionary."""
        return {
            "detection_id": detection.detection_id,
            "bias_type": detection.bias_type.value,
            "confidence_score": detection.confidence_score,
            "severity_level": detection.severity_level,
            "impact_assessment": detection.impact_assessment,
            "recommendation": detection.recommendation,
            "timestamp": detection.timestamp.isoformat(),
            "metadata": detection.metadata
        }
    
    def _debiasing_to_dict(self, debiasing: DebiasingResult) -> Dict[str, Any]:
        """Convert DebiasingResult to dictionary."""
        return {
            "result_id": debiasing.result_id,
            "strategy_applied": debiasing.strategy_applied.value,
            "effectiveness_score": debiasing.effectiveness_score,
            "bias_reduction": debiasing.bias_reduction,
            "new_decision_context_keys": list(debiasing.new_decision_context.keys()),
            "recommendations": debiasing.recommendations,
            "timestamp": debiasing.timestamp.isoformat(),
            "metadata": debiasing.metadata
        }
    
    def _reflection_to_dict(self, reflection: SelfReflectionResult) -> Dict[str, Any]:
        """Convert SelfReflectionResult to dictionary."""
        return {
            "reflection_id": reflection.reflection_id,
            "reflection_type": reflection.reflection_type,
            "content_keys": list(reflection.content.keys()),
            "confidence_in_reflection": reflection.confidence_in_reflection,
            "improvement_suggestions": reflection.improvement_suggestions,
            "timestamp": reflection.timestamp.isoformat(),
            "metadata": reflection.metadata
        }
    
    def _compile_recommendations(self, 
                                bias_detections: List[BiasDetectionResult],
                                debiasing_results: List[DebiasingResult], 
                                reflection_result: SelfReflectionResult) -> List[str]:
        """Compile all recommendations from different components."""
        recommendations = []
        
        # Add recommendations from bias detections
        for detection in bias_detections:
            recommendations.append(detection.recommendation)
        
        # Add recommendations from debiasing results
        for result in debiasing_results:
            recommendations.extend(result.recommendations)
        
        # Add recommendations from metacognitive reflection
        recommendations.extend(reflection_result.improvement_suggestions)
        
        # Remove duplicates while preserving order
        unique_recommendations = []
        for rec in recommendations:
            if rec not in unique_recommendations:
                unique_recommendations.append(rec)
        
        return unique_recommendations
    
    def enhance_cognitive_agent(self, agent: CognitiveAgent) -> CognitiveAgent:
        """
        Add cognitive bias mitigation capabilities to an existing CognitiveAgent.
        This method extends the agent with bias detection, mitigation, and metacognitive capabilities.
        """
        # Add new attributes to the agent to support bias mitigation
        if not hasattr(agent, 'bias_detections'):
            agent.bias_detections = []
        if not hasattr(agent, 'metacognitive_reflections'):
            agent.metacognitive_reflections = []
        if not hasattr(agent, 'debiasing_applications'):
            agent.debiasing_applications = []
        
        return agent
    
    def integrate_with_cognitive_os(self, cognitive_os: AdvancedCognitiveOS) -> AdvancedCognitiveOS:
        """
        Integrate bias mitigation capabilities with the existing Cognitive OS.
        """
        # Add bias mitigation methods to the cognitive OS
        cognitive_os.bias_mitigation_system = self
        
        # Enhance existing cognitive agents with bias mitigation capabilities
        for agent_id, agent in cognitive_os.cognitive_agents.items():
            cognitive_os.cognitive_agents[agent_id] = self.enhance_cognitive_agent(agent)
        
        # Add bias mitigation analysis method
        cognitive_os.analyze_decision_for_biases = self._create_analysis_method(cognitive_os)
        
        # Add cognitive bias report method
        cognitive_os.generate_bias_report = self._create_report_method(cognitive_os)
        
        return cognitive_os
    
    def _create_analysis_method(self, cognitive_os):
        """Create an analysis method bound to the cognitive OS instance."""
        def analyze_decision_for_biases(self, agent_id: str, decision_context: Dict) -> Dict[str, Any]:
            if agent_id not in self.cognitive_agents:
                return {"error": "Agent not found"}
            
            agent = self.cognitive_agents[agent_id]
            analysis_result = self.bias_mitigation_system.analyze_decision_context(agent, decision_context)
            
            # Store the analysis result in the agent for future reference
            if not hasattr(agent, 'bias_detections'):
                agent.bias_detections = []
            agent.bias_detections.append(analysis_result)
            
            return analysis_result
        
        # Bind this method to the cognitive OS instance
        import types
        cognitive_os._analyze_decision_for_biases = types.MethodType(analyze_decision_for_biases, cognitive_os)
        return cognitive_os._analyze_decision_for_biases
    
    def _create_report_method(self, cognitive_os):
        """Create a report method bound to the cognitive OS instance."""
        def generate_bias_report(self) -> Dict[str, Any]:
            # Get statistics from the bias detector
            bias_stats = {}
            for bias_type, _ in self.bias_mitigation_system.bias_detector.detection_history.items():
                bias_stats[bias_type.value] = self.bias_mitigation_system.bias_detector.get_bias_statistics(bias_type)
            
            # Get debiasing effectiveness
            debiasing_effectiveness = self.bias_mitigation_system.debiasing_engine.get_effectiveness_report()
            
            # Get metacognitive awareness report
            metacognitive_report = self.bias_mitigation_system.metacognitive_system.get_awareness_report()
            
            return {
                "timestamp": datetime.now().isoformat(),
                "system_overview": {
                    "total_agents": len(self.cognitive_agents),
                    "total_bias_detections": sum(len(agent.bias_detections) if hasattr(agent, 'bias_detections') else 0 
                                               for agent in self.cognitive_agents.values()),
                    "total_reflections": sum(len(agent.metacognitive_reflections) if hasattr(agent, 'metacognitive_reflections') else 0 
                                           for agent in self.cognitive_agents.values())
                },
                "bias_statistics": bias_stats,
                "debiasing_effectiveness": debiasing_effectiveness,
                "metacognitive_awareness": metacognitive_report,
                "recommendations": [
                    "Continue monitoring cognitive biases in decision-making processes",
                    "Implement regular calibration exercises for confidence judgments",
                    "Encourage diverse perspectives in critical decisions",
                    "Develop decision templates that incorporate bias mitigation steps"
                ]
            }
        
        # Bind this method to the cognitive OS instance
        import types
        cognitive_os._generate_bias_report = types.MethodType(generate_bias_report, cognitive_os)
        return cognitive_os._generate_bias_report


def demonstrate_bias_mitigation_integration():
    """
    Demonstrate the integration of cognitive bias mitigation with the cognitive modeling system.
    """
    print("🧠 IntelGraph Cognitive Bias Mitigation Integration Demonstration")
    print("=" * 70)
    
    # Import the main cognitive modeling system
    from .cognitive_modeling import AdvancedCognitiveOS, CognitiveDomain, BehavioralPattern, SimulationType
    
    # Create cognitive OS instance
    cognitive_os = AdvancedCognitiveOS()
    
    # Create the bias mitigation system
    bias_mitigation_system = CognitiveBiasMitigationSystem()
    
    # Integrate the bias mitigation system with the cognitive OS
    cognitive_os = bias_mitigation_system.integrate_with_cognitive_os(cognitive_os)
    
    print(f"✅ Cognitive Bias Mitigation System integrated with Cognitive OS")
    print(f"   - Bias Detector with {len(bias_mitigation_system.bias_detector.bias_identifiers)} detection algorithms")
    print(f"   - Debiasing Engine with {len(bias_mitigation_system.debiasing_engine.debiasing_strategies)} strategies")
    print(f"   - Metacognitive System with awareness level: {bias_mitigation_system.metacognitive_system.awareness_level:.2f}")
    
    # Create a cognitive agent for demonstration
    agent_configs = [{
        "name": "BiasAwareAgent",
        "domain": CognitiveDomain.INDIVIDUAL,
        "patterns": [BehavioralPattern.ADAPTIVE, BehavioralPattern.PROACTIVE]
    }]
    
    agent_ids = cognitive_os.initialize_cognitive_agents(agent_configs)
    agent_id = agent_ids[0]
    
    print(f"✅ Created cognitive agent: {cognitive_os.cognitive_agents[agent_id].name}")
    
    # Demonstrate bias analysis for a decision context
    decision_context = {
        "options": ["Option A", "Option B", "Option C"],
        "time_pressure": 0.8,
        "information_completeness": 0.6,
        "cognitive_load": 0.7,
        "emotional_state": {"intensity": 0.3, "dominant_emotion": "anxiety", "influence_on_decision": 0.4},
        "evidence": [
            {"supports": True, "source_reliability": 0.8},
            {"supports": True, "source_reliability": 0.7},
            {"supports": False, "source_reliability": 0.9}
        ],
        "initial_estimate": 50.0,
        "final_estimate": 55.0,
        "adjustment_process": {"amount": 5.0, "direction": "upward"},
        "expected_outcomes": {"positive_outlook": 0.85, "negative_outlook": 0.15}
    }
    
    print(f"\n🔍 Analyzing decision context for cognitive biases...")
    analysis_result = cognitive_os._analyze_decision_for_biases(agent_id, decision_context)
    
    print(f"   Bias detections: {len(analysis_result['bias_detections'])}")
    print(f"   Debiasing applications: {len(analysis_result['debiasing_results'])}")
    print(f"   Metacognitive insights: {len(analysis_result['metacognitive_reflection']['improvement_suggestions'])} suggestions")
    
    # Show some of the recommendations
    if analysis_result['mitigation_recommendations']:
        print(f"   Sample recommendations:")
        for i, rec in enumerate(analysis_result['mitigation_recommendations'][:3]):
            print(f"     {i+1}. {rec}")
    
    # Generate a comprehensive bias report
    print(f"\n📊 Generating cognitive bias report...")
    bias_report = cognitive_os._generate_bias_report()
    
    print(f"   Total agents: {bias_report['system_overview']['total_agents']}")
    print(f"   Total bias detections: {bias_report['system_overview']['total_bias_detections']}")
    print(f"   Total reflections: {bias_report['system_overview']['total_reflections']}")
    
    # Show system recommendations
    print(f"\n💡 System Recommendations:")
    for i, rec in enumerate(bias_report['recommendations']):
        print(f"   {i+1}. {rec}")
    
    print(f"\n🎯 Cognitive Bias Mitigation System Successfully Integrated!")
    print(f"   - Enhanced agents with bias detection capabilities")
    print(f"   - Added debiasing strategy applications")
    print(f"   - Integrated metacognitive awareness functions")
    print(f"   - Provided comprehensive bias analysis and reporting")
    
    return cognitive_os, bias_mitigation_system


if __name__ == "__main__":
    # Run the demonstration
    demonstrate_bias_mitigation_integration()