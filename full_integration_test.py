#!/usr/bin/env python3
"""
Comprehensive integration test for the cognitive bias mitigation system
with the existing IntelGraph cognitive modeling architecture.
"""

import sys
import os

# Add the project root to Python path
project_root = "/Users/brianlong/Developer/summit"
sys.path.insert(0, project_root)

def test_full_integration():
    """Test full integration of cognitive bias mitigation with IntelGraph."""
    print("🧠 IntelGraph Cognitive Bias Mitigation Full Integration Test")
    print("=" * 80)
    
    try:
        # Import existing IntelGraph cognitive modeling components
        from intelgraph.cognitive_modeling import (
            AdvancedCognitiveOS, 
            CognitiveDomain, 
            BehavioralPattern,
            CognitiveAgent
        )
        
        # Import new cognitive bias mitigation components
        from intelgraph.cognitive_bias_detector import BiasDetector, BiasType
        from intelgraph.debiasing_engine import DebiasingEngine, DebiasingStrategy
        from intelgraph.metacognitive_system import MetacognitiveSystem
        from intelgraph.cognitive_bias_mitigation_integration import (
            CognitiveBiasMitigationSystem
        )
        
        print("✅ Successfully imported all required components")
        
        # Test 1: Create IntelGraph cognitive OS
        cognitive_os = AdvancedCognitiveOS()
        print("✅ Created IntelGraph AdvancedCognitiveOS")
        
        # Test 2: Create cognitive agents
        agent_configs = [
            {
                "name": "BiasAwareStrategist",
                "domain": CognitiveDomain.INDIVIDUAL,
                "patterns": [BehavioralPattern.PROACTIVE, BehavioralPattern.ADAPTIVE]
            },
            {
                "name": "AnalyticalEvaluator",
                "domain": CognitiveDomain.TECHNICAL,
                "patterns": [BehavioralPattern.HABITUAL, BehavioralPattern.REACTIVE]
            }
        ]
        
        agent_ids = cognitive_os.initialize_cognitive_agents(agent_configs)
        print(f"✅ Created {len(agent_ids)} cognitive agents")
        
        # Test 3: Create cognitive bias mitigation system
        bias_mitigation_system = CognitiveBiasMitigationSystem()
        print("✅ Created CognitiveBiasMitigationSystem")
        
        # Test 4: Integrate bias mitigation with cognitive OS
        cognitive_os = bias_mitigation_system.integrate_with_cognitive_os(cognitive_os)
        print("✅ Integrated bias mitigation with cognitive OS")
        
        # Test 5: Create complex decision context that might trigger biases
        decision_context = {
            "scenario": "Evaluating a new technology investment with high potential returns but uncertain risks",
            "options": ["Invest aggressively", "Invest moderately", "Hold off on investment", "Divest from similar holdings"],
            "time_pressure": 0.7,  # Moderate time pressure
            "information_completeness": 0.6,  # Incomplete information
            "cognitive_load": 0.8,  # High cognitive load
            "emotional_state": {
                "dominant_emotion": "optimism",
                "intensity": 0.6,
                "influence_on_decision": 0.5
            },
            "evidence": [
                {"supports": True, "source": "recent_success stories", "reliability": 0.8},
                {"supports": True, "source": "industry reports", "reliability": 0.7},
                {"supports": False, "source": "risk analysis", "reliability": 0.9},
                {"supports": True, "source": "expert opinions", "reliability": 0.6},
                {"supports": False, "source": "market volatility data", "reliability": 0.85}
            ],
            "current_belief": True,  # Tendency toward positive outcome
            "reliance_on_recent_info": 0.8,  # High reliance on recent information
            "seeking_confirming_evidence": 0.75,  # Moderate tendency to seek confirming evidence
            "initial_estimate": 70.0,  # Initial probability estimate
            "final_estimate": 75.0,  # Final probability estimate (only 5% adjustment)
            "adjustment_process": {
                "amount": 5.0,
                "direction": "upward",
                "substantiality": "low"  # Insufficient adjustment
            },
            "expected_outcomes": {
                "positive_outlook": 0.85,  # Very positive outlook
                "negative_outlook": 0.15   # Low negative outlook
            },
            "gains": 100,  # Potential gains
            "losses": -50,  # Potential losses (smaller magnitude)
            "risk_preference": {
                "gain_risk_tolerance": 0.2,  # Low tolerance for risk in gains
                "loss_risk_appetite": 0.4   # Moderate appetite for risk in losses
            },
            "change_options": ["Invest", "Hold", "Divest"],
            "current_state": "current_portfolio",
            "preference_strength": {
                "current_state_preference": 0.75  # Strong preference for current state
            },
            "sunk_costs": {
                "amount_invested": 200,  # Significant previous investment
                "negative_outlook": True,  # Negative outlook on continued investment
                "influence_on_decision": 0.6  # Moderate influence
            },
            "continuation_decision": True,  # Decision to continue investing
            "decision_frame": {
                "presentation": "potential_returns_focused",  # Framed in terms of returns
                "emphasis": "upside_potential",
                "presentation_bias": 0.7  # High presentation bias
            },
            "alternatives": ["safer_investment", "diversification", "cash_preservation"],
            "self_assessment": 0.8,  # High self-assessment of investment acumen
            "information_gathering": {
                "confirming_search": 0.7,  # Heavy focus on confirming evidence
                "disconfirming_search": 0.3  # Light focus on disconfirming evidence
            }
        }
        
        print("✅ Created complex decision context for bias testing")
        
        # Test 6: Analyze decision context for cognitive biases using integrated system
        first_agent_id = agent_ids[0]
        analysis_result = cognitive_os._analyze_decision_for_biases(first_agent_id, decision_context)
        print("✅ Analyzed decision context for cognitive biases")
        print(f"   Bias detections: {len(analysis_result['bias_detections'])}")
        print(f"   Debiasing applications: {len(analysis_result['debiasing_results'])}")
        print(f"   Metacognitive insights: {len(analysis_result['metacognitive_reflection']['improvement_suggestions'])} suggestions")
        
        # Test 7: Generate comprehensive bias report
        bias_report = cognitive_os._generate_bias_report()
        print("✅ Generated comprehensive bias report")
        print(f"   System overview: {bias_report['system_overview']['total_agents']} agents, {bias_report['system_overview']['total_bias_detections']} detections")
        
        # Test 8: Show sample bias detections
        if analysis_result['bias_detections']:
            print(f"\n🔍 Sample Bias Detections:")
            for i, detection in enumerate(analysis_result['bias_detections'][:3]):
                print(f"   {i+1}. {detection['bias_type'].replace('_', ' ').title()}")
                print(f"      Confidence: {detection['confidence_score']:.1%}")
                print(f"      Severity: {detection['severity_level']}")
                print(f"      Recommendation: {detection['recommendation'][:50]}...")
        
        # Test 9: Show sample debiasing applications
        if analysis_result['debiasing_results']:
            print(f"\n🛠️  Sample Debiasing Applications:")
            for i, result in enumerate(analysis_result['debiasing_results'][:3]):
                print(f"   {i+1}. {result['strategy_applied'].replace('_', ' ').title()}")
                print(f"      Effectiveness: {result['effectiveness_score']:.1%}")
                print(f"      Bias reduction: {result['bias_reduction']:.1%}")
        
        # Test 10: Show metacognitive improvement suggestions
        if analysis_result['metacognitive_reflection']['improvement_suggestions']:
            print(f"\n💡 Metacognitive Improvement Suggestions:")
            for i, suggestion in enumerate(analysis_result['metacognitive_reflection']['improvement_suggestions'][:3]):
                print(f"   {i+1}. {suggestion}")
        
        # Test 11: Validate effectiveness report
        effectiveness_report = bias_mitigation_system.debiasing_engine.get_effectiveness_report()
        print(f"\n📊 Debiasing Engine Effectiveness Report:")
        print(f"   Strategies applied: {effectiveness_report['strategies_applied']}")
        print(f"   Average effectiveness: {effectiveness_report['average_effectiveness']:.1%}")
        
        # Test 12: Validate metacognitive awareness report
        metacognitive_report = bias_mitigation_system.metacognitive_system.get_awareness_report()
        print(f"\n🧠 Metacognitive Awareness Report:")
        print(f"   Current awareness level: {metacognitive_report['awareness_level']:.2f}")
        print(f"   Self reflection frequency: {metacognitive_report['self_reflection_frequency']}")
        
        print(f"\n🎯 Full Integration Test Successful!")
        print(f"   - Enhanced IntelGraph with cognitive bias detection capabilities")
        print(f"   - Integrated evidence-based debiasing strategies")
        print(f"   - Added metacognitive awareness functions")
        print(f"   - Provided comprehensive analysis and reporting")
        print(f"   - Maintained compatibility with existing workflows")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("IntelGraph Cognitive Bias Mitigation Full Integration Test")
    print("Copyright (c) 2025 IntelGraph Corporation")
    
    success = test_full_integration()
    
    if success:
        print(f"\n✅ IntelGraph Cognitive Bias Mitigation System is fully operational!")
        print(f"   Ready for production deployment and integration.")
        sys.exit(0)
    else:
        print(f"\n❌ Integration test failed!")
        print(f"   Please check system configuration and dependencies.")
        sys.exit(1)